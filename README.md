# 🚀 Buildathon: Make Wednesdays Great Again

**Masters' Union · For AI Developers · Winner gets Rs. 25,000**

> **Every team must build in a fork of this repository.** Projects not built in a fork of this repo won't be judged.

| | |
|---|---|
| **Date** | Wednesday, 18 November 2026 |
| **Hacking** | **3:00 PM – 7:00 PM IST** (code freeze at 7:00 PM sharp) |
| **Venue** | CDS Audi, 8th floor |
| **Prize** | Rs. 25,000 to the winning team |
| **Register your fork** | 👉 **[https://forms.gle/ZJUYKwTYjsMsVB2b9](https://forms.gle/ZJUYKwTYjsMsVB2b9)** (**deadline 3:30 PM IST**) |
| **Final submission** | Your fork as it stands at **7:00 PM IST**. There's nothing else to submit. |

> 🤖 **Using an AI coding agent?** Point it at [`AGENTS.md`](AGENTS.md). It has the full event brief, tracks, judging and rules in a form agents can read directly. Claude Code loads it automatically through `CLAUDE.md`, and Codex reads `AGENTS.md` natively.

---

## 🎯 Pick one build track

| # | Track | Brief |
|---|---|---|
| **01** | **Build for the Physical World** | Make a real-world task easier, faster or more reliable. Show it in a realistic scenario. |
| **02** | **Build for AI Agents** | Find something an agent struggles with. Build the tool that fixes it, then demo the agent using it. |
| **03** | **Build in Your Area of Expertise** | Pick a field you know firsthand. Ship a working product that improves how people handle it today. |

## ⚖️ How you'll be judged (each criterion is ⅓ of your score)

| Criterion | The question judges ask |
|---|---|
| **Working product** | Does it do what you say it does? Show the core workflow in your demo. |
| **Problem insight** | Who faces this problem, and why does it happen? |
| **Depth of execution** | How well did you solve the hardest part of the build? |

---

## Why fork this repo?

Everyone starts from the same commit (the **genesis commit**) at the same time. Organizers can then check that:
- all code was written **during** the Buildathon and not brought in from an earlier project,
- teams commit steadily instead of pasting in one huge AI-generated dump at the end,
- every repo stays public and visible while you build.

The organizers track every fork automatically: commits, timing and activity. Read [RULES.md](RULES.md) before you write any code.

---

## ✅ Setup (about 5 minutes, do it at 3:00 PM)

**In short:** fork → register your fork in the form **by 3:30 PM** → build → push before 7:00 PM.

### 1. Fork this repo
Click **Fork** (top right). On the fork screen:
- **Owner:** one team member's personal account. Only **one fork per team**.
- **Repository name:** `buildathon-<team-name>`, for example `buildathon-byte-bandits`
- Click **Create fork**.

> ⚠️ Don't download a ZIP or copy the files into a new repo. **It has to be a real GitHub fork**, or the tracker can't see you.

### 2. Keep it public
Forks of a public repo are public. **Don't make it private, archive it, or delete it** until judging is over.

### 3. Add your teammates
In your fork: **Settings → Collaborators → Add people**. Add each teammate's GitHub account so their commits count toward the team.

### 4. Enable Actions
Open the **Actions** tab of your fork and click **"I understand my workflows, go ahead and enable them"**. This runs the automatic check on every push.

### 5. Make your registration commit (your first commit)
Fill in [`team.json`](team.json). `track` must be one of `physical-world`, `ai-agents` or `area-of-expertise`. Then:

```bash
git clone https://github.com/<your-username>/buildathon-<team-name>.git
cd buildathon-<team-name>
# edit team.json
git add team.json
git commit -m "register: <team name>"
git push
```

The **Hackathon check** in the Actions tab should go green ✅. If it's red, open the run to see what's wrong in `team.json`.

### 6. Register your fork (deadline: 3:30 PM IST)
👉 **[https://forms.gle/ZJUYKwTYjsMsVB2b9](https://forms.gle/ZJUYKwTYjsMsVB2b9)**

It's a 4-question Google Form: team name, fork link, track, team members. It connects your repo to the organizers' live tracker.

- Fill it in **once per team**, right after forking, and **no later than 3:30 PM IST**. **Teams that don't register can't be tracked.**
- Paste your **fork's** URL (`https://github.com/<you>/buildathon-<team-name>`), not this starter repo's.
- Need to change something? Use the **"Edit your response"** link on the confirmation page. Don't fill it in twice.
- **Final submission is automatic.** Whatever is pushed to your fork at 7:00 PM IST is what gets judged.

---

## 🛠 While you build (3:00 – 7:00 PM)

- Put your code anywhere in the repo (`app/`, `src/`, `frontend/`, `backend/`…). There's no required layout.
- **Commit early, commit often**, at least every 30 minutes of real work, with messages that say what changed.
- **Push regularly.** Commits you never push don't exist to the tracker.
- AI coding tools (Claude Code, Codex, Cursor, Copilot…) are **allowed and encouraged**. Keep `AGENTS.md` and `CLAUDE.md` in the repo; they keep your agent within the rules.
- Before 7:00 PM, replace the "Your project" section below with your project's README.

## 🧊 Code freeze: 7:00 PM IST

At 7:00 PM the tracker takes a snapshot of every fork. **Commits pushed after code freeze are ignored.** Judges look at your last commit before 7:00 PM.

## ❌ Things that get you flagged

- Rewriting history (`git push --force`, rebasing away the genesis commit, squashing everything into one commit)
- Commits dated before 3:00 PM
- One or two giant commits containing most of the project
- A repo that isn't a fork of this one, or that's private or deleted

See [RULES.md](RULES.md) for the full list.

---

## Your project

### ParkEasy

**Team:** ParkEasy  
**Track:** Build for the Physical World  
**Tagline:** Parking before you arrive.

Drivers heading to DLF Cyber City often learn whether parking is available only after they reach the entrance. Public lots, office visitor bays and gated societies are hard to compare because each location has its own availability, access rules and prices. ParkEasy lets a driver pick an eligible space in advance and know which gate to use.

### Run the demo

With Python 3 installed, run this from the repository root and open http://localhost:8000.

```sh
python -m http.server 8000 --directory app
```

The app needs no build, API keys or account. For Netlify, connect this fork and use the checked-in publish directory configuration, or upload the `app` folder as a manual deploy.

### Judge walkthrough

1. Open **Ask ParkEasy** and tap **Covered bike at CyberHub**. The inline agent offers one bookable match with the price, location, and duration. Tap **Reserve** to go directly to the parking pass. The map and results are available for comparison.
2. Select **I’ve parked** to confirm the simulated payment and start the session.
3. Select **View my forest**. Use **Demo · Add 30 min** to demonstrate the forest growing in increments. After 120 parked minutes, the first tree is complete. Rotate the scene to see the garage and forest.
4. Open **My parking** and select **I’ve moved my vehicle**. Pick a star rating and submit your review. Check **My parking** to see the completed session.

### How it works

- The hard part is preserving a consistent inventory through reserve, manual check-in and checkout. A reservation holds one slot for its vehicle. Check-in records demo payment and an end time exactly once. Checkout restores the slot and opens review. Session state, the last search and reviews persist in browser storage. Browsers with Web Locks serialize booking transitions across tabs on the same origin.
- Recommendations check the vehicle’s available capacity and the selected preferences within 900 m of the chosen DLF destination. The app returns up to five using straight-line distance by default. Price and rating sorts use the same eligibility checks.
- The assistant matches requests in English or Hinglish to supported destinations, vehicles, durations, amenities and budgets. It uses the Apache 2.0 [MiniLM sentence model](https://huggingface.co/Xenova/all-MiniLM-L6-v2) through Transformers.js when ready. Local matching returns results while the model is loading or unavailable. A match is held only after the driver confirms the quoted reservation.
- Online map imagery uses [OpenStreetMap](https://www.openstreetmap.org/copyright). Google Maps opens only through a directions link. A labeled DLF schematic keeps browsing available if the map cannot load.
- Listings, host permissions, addresses/entrances, prices, ratings, capacities, receipts and 360° scenes are simulated. Demo availability assumes the listing is open for the requested session. Arrival and departure are self-reported. There is no supplier UI, payment gateway, shared inventory, or background alert service.
- The isometric garage and personal forest use original canvas artwork. The forest uses actual or simulated time between check-in and checkout, with one tree per 120 parked minutes. The displayed percentage measures progress toward the next tree milestone.
- For a real pilot, onboard permitted hosts offline in one DLF cluster and build enough legal supply within 500 m before inviting drivers.
