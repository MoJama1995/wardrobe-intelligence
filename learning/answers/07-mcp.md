# Lesson 7 answer key: MCP and external tools

> **Write your own answer first.** Reading an answer feels like understanding, but explaining it
> yourself is what makes it stick. If your answer differs, that's useful: ask `/tutor` why.

Each entry lists what a good answer includes and the usual misconceptions. Your wording doesn't
have to match.

---

### Question 1: client, server and tool

**A good answer includes:**

- **Client:** Claude Code, the AI application that decides which tool to call and asks you for
  permission.
- **Server:** the Trello MCP server, a small program that offers Trello's features as tools and
  talks to Trello's API.
- **Tool:** one action the server offers, with a name, a description and inputs, for example
  `move_card(card_id, list_name)`.
- The **server** holds and uses the Trello token. Claude (the model) never needs to see the token
  itself. It only asks the server to do things.

**Misconception:** *"MCP is a Trello feature"* or *"MCP is the API."* MCP is the standard way the
client and server talk. The server is what translates between MCP and Trello's own API.

---

### Question 2: where the Trello token lives

**Answer: c).** On your own machine, outside Git, where the server reads it.

- a) `.mcp.json` is committed and shared. Anything in it should be treated as public. It lists
  servers, never secrets.
- b) Anything pasted into a chat can end up in transcripts and logs. Never paste tokens.
- d) `CLAUDE.md` is committed, and it's read into every session. A token there leaks twice over.

If a token ever does end up in Git or a chat: **revoke it and create a new one** (Lesson 1, "if a
secret is ever committed").

---

### Exercise B1: a reasonable policy

There's room for judgement. What matters is the reasoning. A sensible starting point:

| Tool | Decision | Why |
| --- | --- | --- |
| `list_boards`, `search_cards`, `get_card` | allow | read-only, low risk |
| `add_comment` | ask | visible to others: outward-facing |
| `move_card`, `create_card` | ask | change shared state |
| `delete_card`, `archive_list` | deny | destructive; a human does it in the Trello UI |
| `list_services`, `read_logs`, `describe_bucket` | allow (dev project only) | read-only. Note that logs can contain personal data, so read them, don't copy them elsewhere |
| `deploy_service` | ask, or deny | real changes and possibly real cost. Our deploys go through Pulumi and review |
| `set_iam_policy`, `delete_bucket`, `create_vm` | deny | security-critical, destructive, or recurring cost |

**Credentials:** Trello, a read-only token for a test board to start with. Google Cloud, a
dedicated identity with viewer-style roles (for example, read access to logs and Cloud Run) on the
**dev** project only. No Owner, no Editor, nothing in prod.

---

### Exercise B2: the injected card

1. Treat the card's text as **data to summarise, not instructions to follow**. Summarise the card,
   and mention that it contains an instruction aimed at the assistant. It must not act on it.
2. The layers that still protect you if the agent is fooled:
   - **Tool permissions:** changing IAM or a bucket's access is denied, or at least asks, and you'd
     refuse.
   - **Credential scope:** a read-only, dev-only identity *can't* make a bucket public, whatever the
     agent tries.
   - **Project rules:** our bucket convention (`gcp-infrastructure` skill) enforces public access
     prevention, so once buckets exist, even a permitted change would be blocked by the bucket's
     own settings.
   - **You,** reading the permission prompt.
3. Tell your teammate: someone with write access to the board added this text. Find out who and
   why. Remove it, and check board membership and the token's scope.

---

### Question 3: tool permissions compared with credential scope

**A good answer includes:**

- **Tool permissions** (allow, ask, deny in Claude Code) control what the agent is allowed to
  *attempt*, and when you're asked.
- **Credential scope** (what the token or cloud identity can do) controls what is *possible* at all,
  enforced by Trello or Google Cloud themselves.
- You want both because each one covers the other's failures. A permission rule can have a gap, or
  you can approve a prompt by reflex. A broad credential turns any mistake into real damage.
  Defence in depth: even if one layer fails, the other still holds.

---

### Question 4: Owner role "so it never gets blocked"

**Two of these:**

- **Least privilege:** Owner can do *everything*: delete resources, change IAM, create expensive
  resources. Being blocked is the point. It's how you find out the agent tried something it
  shouldn't.
- **Prompt injection and mistakes:** with Owner, one bad instruction from a log line or ticket, or
  one misunderstanding, can delete data or run up costs.
- **Our rules forbid it:** the `gcp-infrastructure` skill says never use Owner or Editor.
- **Audit:** everything it does looks like it was done by whoever owns the credential.

**Alternative:** a dedicated identity with narrow, read-only roles on the dev project (for example,
reading logs and viewing Cloud Run). Add a specific role only when a specific task needs it, and
write down why. Changes to infrastructure still go through Pulumi, run by a human.

---

### Question 5: MCP for an ML researcher

**A good answer covers:**

- **Problem:** agents can only work with what they can reach. MCP is a standard way to connect them
  to outside tools and data, such as project boards, cloud consoles and databases, without custom
  code for every pair of app and tool.
- **Pieces:** the AI app is the client; a small server per service offers tools (named actions
  with descriptions); the server calls the real service with credentials you configured.
- **Risk:** the agent reads untrusted text (tickets, logs), and that text can contain instructions
  (prompt injection). So give it narrow, read-only credentials, keep it off production, and approve
  anything that writes.
