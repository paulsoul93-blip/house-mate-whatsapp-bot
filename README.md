# House Mate WhatsApp Bot

A private, visual household assistant for the **House Mate App** WhatsApp group at **19 Silver Birch Close, PE29 7BW**.

## Group commands

- `/cleaning` - current cleaning duty, Monday-to-Sunday dates, next person, complete checklist, and the relevant bin reminder.
- `/bins` - next collection date, Sunday evening put-out time, and the correct blue recycling or black/grey residual bin.
- `/help` - the visual welcome card explaining the household shortcuts.
- `/pussy` - sends the private shared house photo stored locally in `data/pussy.jpg`.
- `/testweekly` - owner-only preview of the exact Sunday 19:00 handover card; it does not advance the rota.

The bin card also uses the local photorealistic `data/bins-photo.png` asset with blue recycling and black residual bins. It is intentionally ignored by GitHub and stays on this computer.

All public commands work for every member of the configured WhatsApp group. Owner-only legacy administration commands remain available for maintaining the rota.

## Automatic behaviour

- Posts a one-time visual welcome card after a new welcome version is deployed.
- Welcomes people when they are added to the target WhatsApp group.
- Rotates the cleaning duty and posts a visual handover card every Sunday at 19:00 Europe/London.
- Fetches collection dates from the official Huntingdonshire District Council calendar for the exact property.
- Caches validated council data for resilience. If live and cached data are unavailable, it reports that state and never guesses a bin type.

## Cleaning checklist

1. Wash the kitchen sink and worktops.
2. Vacuum the kitchen, then wet-mop the floor.
3. Clean the toilets, bathrooms, and shower area.
4. Put out the correct bin after 18:00 on the evening before collection.

## Local setup

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd run check
npm.cmd start
```

Open `http://127.0.0.1:3000/qr` only if WhatsApp needs to be linked. The QR code is generated locally and is not sent to an external image service.

## Windows persistence

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\register-autostart.ps1
```

The `HouseMateWhatsAppBot` scheduled task starts the bot after sign-in and restarts it after a failure. The computer must remain powered on, awake, online, and signed in to WhatsApp.

## Free 24/7 deployment

For a permanent free host, use an Oracle Cloud Always Free VM. Render's free web services sleep after inactivity and have an ephemeral filesystem, which can lose the WhatsApp session; that is not suitable for this bot.

Create an Ubuntu ARM VM in the Oracle home region with an Always Free shape, then deploy from this checkout:

```bash
export ORACLE_VM_IP="your.public.ip"
export ORACLE_VM_USER="ubuntu"
export ORACLE_SSH_KEY_PATH="/path/to/oracle.key"
./scripts/deploy_oracle.sh
```

The script keeps WhatsApp authentication, rota state, welcome state, council cache, logs, and the private shared photo in the remote `data/` directory. The HTTP port stays private; use the printed SSH tunnel to open `/qr` for the one-time WhatsApp scan. The laptop does not need to remain on after the cloud session is authenticated.

The bot uses the exact `WA_GROUP_ID` when configured, preventing messages from being sent to another group with the same title. A WhatsApp account is still required: a linked device inherits that account's name and number.

## Quality checks

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run check
npm.cmd audit --omit=dev
```

## Security

`.env`, WhatsApp authentication state, cached council data, runtime logs, rota state, and the shared photo are stored under ignored local paths. No credentials, linked-device secrets, or private photos belong in the repository.
