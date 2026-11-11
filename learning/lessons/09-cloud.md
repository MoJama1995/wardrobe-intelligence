# Lesson 9: Understanding cloud computing

**Time:** about 2 hours, in four parts (A–D). You don't need a Google Cloud account for any of it.

**By the end you can:**

- explain what "the cloud" is in terms of compute, storage and networking
- tell virtual machines, managed services and serverless apart, and say when each fits
- choose between Cloud Functions and Cloud Run for a given job
- explain Google Cloud projects, billing, IAM and regions, and why each matters to us
- design least-privilege permissions for our two services
- estimate what our GPU inference service would cost, and why "scale to zero" matters so much
- read our Pulumi code and explain what infrastructure as code is for

| You need now | You can learn later |
| --- | --- |
| compute, storage, networking; VMs vs managed vs serverless; Cloud Run; projects, billing, IAM, service accounts, regions; Pulumi stacks, preview and up | VPCs and firewalls, load balancers, Kubernetes (GKE), custom IAM roles, organisation policies, multi-region failover, committed-use discounts |

> **Where we are today:** nothing is deployed. `infrastructure/` contains a Pulumi skeleton with no
> cloud resources yet. This lesson explains the plan, so that when we build it, you know why each
> piece is there.

---

## Part A: What cloud computing is (20 minutes)

### The problem

Our product needs a computer that's always reachable from the internet to run the API, a GPU to run
the model, and somewhere safe to keep photos and model weights. Buying and running those machines
yourself means paying for hardware up front, keeping it patched and cooled, replacing broken disks,
and owning a GPU that sits idle most of the night.

### The idea

**Cloud computing means renting computing resources from a provider, on demand, and paying for what
you use.** Google, Amazon and Microsoft run enormous data centres. You ask for what you need through
a website, a command-line tool or code, and get it in seconds.

Almost everything you rent falls into three groups:

| Building block | What it is | In our project (planned) |
| --- | --- | --- |
| **Compute** | something that runs your code: a CPU, memory, sometimes a GPU | the API and the inference service, on **Cloud Run** |
| **Storage** | somewhere that keeps data | photos and model weights in **Cloud Storage (GCS)** buckets; container images in **Artifact Registry** |
| **Networking** | how requests reach your code, and how services reach each other | HTTPS URLs for each Cloud Run service; the API calling inference |

On top of these sit services that solve one job each: **Secret Manager** for passwords and tokens,
**Cloud Logging** for logs, **IAM** for permissions, and **billing** for paying.

```
                         Google Cloud project (dev)
  ┌──────────────────────────────────────────────────────────────────────┐
  │                                                                      │
  │   COMPUTE                                  STORAGE                   │
  │   ┌──────────────────┐   HTTPS   ┌─────────────────────┐             │
  │   │ Cloud Run: api   │──────────▶│ Cloud Run: inference│             │
  │   │ CPU, scales to 0 │           │ L4 GPU, scales to 0 │             │
  │   └───────┬──────────┘           └──────────┬──────────┘             │
  │           │ writes photos                   │ reads weights          │
  │           ▼                                 ▼                        │
  │   ┌──────────────────┐           ┌─────────────────────┐             │
  │   │ GCS: uploads     │           │ GCS: model registry │             │
  │   └──────────────────┘           └─────────────────────┘             │
  │                                                                      │
  │   Artifact Registry (images) · Secret Manager · Cloud Logging · IAM  │
  └──────────────────────────────────────────────────────────────────────┘
          ▲ HTTPS from the user's browser (NETWORKING)
```

### You already know some of this from ML

If you've used Colab, you've used the cloud: you asked for a GPU, Google gave you one on a machine
you never saw, and it was taken away when you left. The difference in production is that **the
service must keep working when nobody has a notebook open**, so the resources are described,
secured and paid for deliberately.

### Exercise A1: classify our system (10 minutes)

On paper or in a notes file, sort each item into **compute**, **storage** or **networking** (some
fit two):

1. `services/api` answering a request
2. the uploaded photo of a jacket
3. the browser's request reaching our API
4. the VLM producing attributes
5. the model weights (`.safetensors` files)
6. the Docker image of `services/inference`
7. the API calling the inference service

**Question 1.** Colab gives you a GPU in seconds. Why can't we just run the product's inference in a
Colab notebook? Give at least two reasons.

---

## Part B: Virtual machines, managed services and serverless (30 minutes)

Cloud services differ in **how much of the machine you manage yourself**. More control means more
work; less control means less work, but more rules to follow.

```
  you manage more                                               you manage less
  ◀────────────────────────────────────────────────────────────────────────────▶

  Virtual machine            Managed service              Serverless
  (Compute Engine)           (Cloud SQL, GCS)             (Cloud Run, Cloud Functions)

  You get a computer.        You get a database or        You give code or a container.
  You install the OS         storage. Google runs the     Google runs it when requests
  updates, Python, your      machines, backups and        arrive, adds copies when busy,
  app, monitoring, and       upgrades. You configure      and stops them all when idle.
  you pay while it's on.     and use it.                  You pay for the time it runs.
```

- A **virtual machine (VM)** is a computer simulated in software on Google's hardware. It behaves like
  a server you own: full control, full responsibility. It costs money every second it's switched on,
  even when nobody uses it.
- A **managed service** is a product Google operates for you. Cloud Storage is a good example: you
  never think about disks, you just store and read files.
- **Serverless** doesn't mean there are no servers. It means **you never see or manage them**. The
  platform starts copies of your code when requests arrive and removes them when traffic stops. When
  it removes all of them, that's called **scaling to zero**: you pay nothing while idle.

The catch with scaling to zero is the **cold start**. The first request after an idle period waits
while a new copy starts. For our small API that's quick. For a VLM it can be long, because the model
weights have to be loaded into GPU memory first.

### Cloud Functions and Cloud Run

Google has two serverless ways to run code. (Google now calls the newer generation of Cloud
Functions **Cloud Run functions**, but you'll still see the old name everywhere.)

| | Cloud Functions | Cloud Run |
| --- | --- | --- |
| You provide | one function's source code | a **container image** (Lesson 10) |
| Good for | small pieces of glue triggered by an event: "when a file lands in this bucket, make a thumbnail" | whole applications: a FastAPI service with many endpoints, custom dependencies, a GPU |
| Control over the environment | limited: Google builds it from your code | complete: anything you can put in a Dockerfile |
| GPU services | not what they're designed for | yes (NVIDIA L4 in some regions) |

We use **Cloud Run** for both services. Our API is a full FastAPI application with middleware and a
contract, and inference needs a GPU and a carefully built environment. Both already have Dockerfiles
(`services/api/Dockerfile`, `services/inference/Dockerfile`), which is exactly what Cloud Run runs.

### When to use managed services

Our rule of thumb: **prefer the most managed option that does the job**. Every server you run
yourself is a server you must patch, monitor and secure, and we're two people. Use a VM only when a
managed service genuinely can't do the job.

### Exercise B1: pick the service (10 minutes)

For each job, choose a VM, Cloud Run, a Cloud Function or Cloud Storage, and write one sentence
explaining why:

1. Our FastAPI backend, which gets a handful of requests per day during development.
2. Resizing each photo into a small thumbnail as soon as it's uploaded to the bucket.
3. Keeping 2,000 user photos safely for years.
4. A research job that fine-tunes a model for 30 hours on 4 GPUs.
5. The VLM inference service, used in bursts while we test.

**Question 2.** Which is the best home for our inference service as planned today?

- a) a Cloud Function, because it's the simplest serverless option
- b) a VM with a GPU that stays on, so there are never cold starts
- c) Cloud Run with a GPU, scaling to zero, because it runs our container, supports GPUs and costs nothing while idle
- d) Cloud Storage, because the model weights live there

**Question 3.** In your own words, what is a cold start, and why is it a much bigger issue for our
inference service than for our API?

---

## Part C: Projects, billing, IAM and regions (35 minutes)

Four Google Cloud concepts come up in every conversation about infrastructure.

### Projects

A **project** is a container for everything you create in Google Cloud: services, buckets,
permissions and settings. It has an ID such as `wardrobe-intelligence-dev`, and almost every command
and API call names one. Deleting a project deletes everything in it.

Our Pulumi code has two **stacks**, `dev` and `prod` (Part D). Each stack names the Google Cloud
project it manages, so experiments can never touch real users' data.

### Billing

A project is linked to a **billing account**, which is the card that gets charged. Two things to
know from day one:

- **Budgets and alerts** email you when spending passes a threshold you choose. They **do not stop
  spending**. They're a smoke alarm, not a fuse.
- Costs come from things that run, things that are stored and data that leaves Google's network.
  An idle Cloud Run service that scales to zero costs essentially nothing. A GPU that stays on costs
  money every second.

Our project rule (from `.claude/skills/gcp-infrastructure/SKILL.md`): **every new resource comes with
a cost estimate, and anything above about $10/month recurring needs an ADR and explicit approval.**

### IAM: who can do what

**IAM** (Identity and Access Management) answers one question: *who* can do *what* on *which
resource*?

```
   WHO (principal)               WHAT (role)                       ON WHICH RESOURCE
   ─────────────────            ──────────────────────────        ─────────────────────────
   you@gmail.com                 roles/storage.objectViewer        the "models" bucket
   api service account           roles/storage.objectCreator       the "uploads" bucket
   api service account           roles/run.invoker                 the inference service
```

- A **principal** is anything that can be given access: a person, a group, or a **service account**.
- A **service account** is an identity for software rather than a person. Each of our Cloud Run
  services runs as its own service account, so the API's code has only the API's permissions.
- A **role** is a named bundle of permissions. `roles/storage.objectViewer` can read files in a
  bucket; `roles/storage.objectCreator` can add new files; `roles/run.invoker` can call a Cloud Run
  service.
- A **binding** connects the three: this principal gets this role on this resource.

The guiding rule is **least privilege**: give each identity the smallest set of permissions it needs,
on the narrowest resource. Grant on the bucket, not on the whole project, and never use the broad
`Owner` or `Editor` roles for software. If the API ever has a security bug, least privilege limits the
damage to what the API could do anyway.

<details>
<summary><strong>Go deeper:</strong> why there are no key files in our project</summary>

A service account can have a **key file**: a JSON file that lets anyone holding it act as that
account, forever, from anywhere. Key files leak (in commits, in Colab notebooks, in screenshots), so
we never create them. Our `.gitignore` and Claude Code's permission rules both block them.

Instead:

- On your laptop, you log in as yourself with `gcloud auth application-default login`. That's
  **Application Default Credentials (ADC)**. Code using Google's client libraries picks it up
  automatically.
- On Cloud Run, the service gets short-lived credentials for its service account automatically.
- GitHub Actions will use **Workload Identity Federation**: GitHub proves who it is to Google and gets
  short-lived credentials, with no stored key.
</details>

### Exercise C1: design permissions for our services (15 minutes)

Our planned services, from `docs/architecture/overview.md`:

- **api** receives photos from the browser, stores each one in the **uploads** bucket, calls
  **inference**, and returns the result.
- **inference** loads model weights from the **model registry** bucket and runs the VLM.

Copy and fill in this table. For each service account, list the roles it needs and the resource each
role is granted on. Then list one thing each service must **not** be able to do.

```
 Service account   Role                              On resource           Why
 ───────────────   ───────────────────────────────   ───────────────────   ──────────────────
 api               ...                               ...                   ...
 inference         ...                               ...                   ...

 api must NOT be able to:        ...
 inference must NOT be able to:  ...
```

One design decision affects your answer: does the API send the **image bytes** to inference, or only
the **location of the file** in the bucket? Pick one and say how it changes the table.

### Regions

A **region** is a geographical location with Google data centres, such as `europe-west1` (Belgium) or
`us-central1` (Iowa). You choose a region for each resource. Three things drive the choice for us:

1. **GPU availability.** Not every region has GPUs on Cloud Run. Our research notes
   (`.claude/skills/gcp-infrastructure/cost-reference.md`, checked 10 November 2026) list L4 GPUs in
   `europe-west1`, `europe-west4`, `us-central1`, `us-east4` and two Asian regions. **London
   (`europe-west2`) was not listed.**
2. **Keep data and compute together.** If photos sit in one region and inference runs in another,
   every request moves data between them: slower, and you pay for the transfer.
3. **Where personal data lives.** Wardrobe photos are personal data, so their location matters.

The region is still an **open decision**. Our Pulumi code reads it from configuration (`gcp:region`)
rather than hard-coding it.

**Question 4.** A teammate creates the uploads bucket in `europe-west2` because it's closest to home,
and the inference service in `europe-west4` because it has L4 GPUs. What problems does this cause?

**Question 5.** You set a $20 budget alert on the dev project. A test GPU service is accidentally left
with one instance always on. What happens to your spending?

---

## Part D: Infrastructure as code with Pulumi (35 minutes)

### The problem

You can create a bucket by clicking through the Google Cloud console. But then: who created it, with
which settings, and why? How do you make an identical one for `prod`? How does your teammate review
it before it exists? Clicking leaves no record and can't be reviewed.

### The idea

**Infrastructure as code (IaC)** means describing your cloud resources in code, committed to Git and
reviewed in pull requests like any other change. A tool reads the code, compares it with what
actually exists, and makes the changes needed to match.

We use **Pulumi**, which lets us write that code in **Python**. A Pulumi program says *what should
exist* ("a private bucket called `wardrobe-intelligence-dev-uploads`, deleting files after 30 days"),
and Pulumi works out *how* to get there.

```
   infrastructure/*.py ──▶ pulumi preview ──▶ "will create 1 bucket, 2 bindings" ──▶ review
   (desired state)          (compares with                                             │
                             what exists)                                              ▼
                                         pulumi up ──▶ Google Cloud changes ──▶ state recorded
                                         (a human runs it, after review)
```

Words you'll need:

- **Stack:** one copy of the infrastructure. We have `dev` and `prod`, each with its own settings.
- **Config:** per-stack settings such as the project ID and region (`pulumi config set ...`).
  Secrets are stored encrypted (`pulumi config set --secret ...`).
- **`pulumi preview`:** shows what *would* change, without changing anything.
- **`pulumi up`:** makes the changes. Pulumi records what it created in its **state**, so next time it
  knows what already exists.

**Who runs Pulumi in our project:** a human, after reviewing the preview and a cost estimate. Claude
Code is not allowed to run *any* `pulumi` command in this repository (`.claude/settings.json`), and
`prod` is only changed after review. You'll run Pulumi yourself only in the optional deployment
extension, together with your teammate.

### Our Pulumi code today

Open these two files:

- [`infrastructure/__main__.py`](../../infrastructure/__main__.py): the entry point. It loads the
  configuration and *exports* three values (environment, project, region) but creates no resources
  yet.
- [`infrastructure/stack_config.py`](../../infrastructure/stack_config.py): the rules every resource
  will follow. Read the comments, then find:
  - `resource_name()`: predictable names such as `wardrobe-intelligence-dev-api`
  - `labels()`: tags on every resource, so the bill can be grouped by app, environment and component
  - `load()`: refuses to run if the stack name doesn't match the `environment` setting, a guard
    against accidentally applying `dev` settings to `prod`

Notice the design: the rules are **plain Python functions** with no Pulumi engine involved, so they
can be unit-tested in milliseconds. Only `load()` talks to Pulumi.

### Exercise D1: test the infrastructure rules (10 minutes)

These are ordinary unit tests. They don't need a Google Cloud account and they don't run Pulumi.

```bash
cd infrastructure
uv sync
uv run pytest -v
```

You should see 7 tests pass. Open `tests/test_stack_config.py` and match each test to the rule it
protects.

Now **predict first, then check**. What will these two lines print?

```bash
uv run python -c "
from stack_config import StackConfig
cfg = StackConfig(environment='dev', project_id='example-project', region='europe-west1')
print(cfg.resource_name('models'))
print(cfg.labels('inference', gpu='l4'))
"
```

Then try `cfg.labels('Inference')` with a capital letter. What happens, and why is it better to fail
here than when Pulumi talks to Google?

### Exercise D2: estimate a cost (15 minutes)

Use the figures in `.claude/skills/gcp-infrastructure/cost-reference.md`. They're research notes from
10 November 2026, so always re-check prices before a real decision. The smallest Cloud Run instance
with an L4 GPU (4 vCPU, 16 GiB, no zonal redundancy) costs **about $1.05 per hour** while it runs.
GPU services use instance-based billing: you also pay for idle time before the instance scales down.

Estimate the monthly cost of the inference service in three situations. Assume a month has 730 hours.

1. **Always on:** one instance never scales down.
2. **Dev testing:** you test on 20 days a month, about 2 hours a day, and each day the instance also
   idles for 15 minutes before scaling down.
3. **Forgotten:** the same as situation 2, except that someone deployed it with `min_instances=1`
   in week 3 of the month and nobody noticed for the last 10 days.

Write down your calculations. Which number would you put in the PR, and which configuration setting
would you insist on?

**Question 6.** Why do we describe infrastructure in code instead of creating it in the console? Give
at least three reasons.

**Question 7.** `pulumi preview` shows `~ update` for a Cloud Run service and `+- replace` for the
uploads bucket. Which line worries you more, and what would you do before running `pulumi up`?

---

## Wrap-up

**Question 8 (explain it back).** Explain to someone who has only used Colab how our product will
run in Google Cloud. Mention compute, storage, scaling to zero, service accounts, the region decision
and how Pulumi fits in.

### Cheat sheet

| Term | One line |
| --- | --- |
| Compute / storage / networking | runs code / keeps data / connects things |
| VM | a rented computer you manage, paid for while it's on |
| Managed service | Google runs it, you use it |
| Serverless | you hand over code or a container; it scales automatically, even to zero |
| Cold start | the delay while a new instance starts; long for a VLM |
| Cloud Run | runs our container images, with or without a GPU |
| Project | the container for all resources, permissions and billing |
| Budget alert | an email when spending passes a threshold; it does **not** stop spending |
| IAM binding | principal + role + resource |
| Service account | an identity for software; one per service |
| Least privilege | the smallest permissions, on the narrowest resource |
| Region | where a resource physically lives; keep data and compute together |
| Pulumi stack | one copy of the infrastructure (`dev`, `prod`) |
| `pulumi preview` / `up` | show changes / apply changes (a human runs both) |

### Done when

- [ ] Exercises A1, B1, C1, D1 and D2 are done
- [ ] You've written answers to Questions 1–8 and compared them with the
      [answer key](../answers/09-cloud.md), or talked them through with `/tutor`
- [ ] You can draw the Part A diagram from memory and point to compute, storage and networking

Next: **Lesson 10, Docker.** You'll build the container images that Cloud Run runs.
