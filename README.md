# House Mate App - Bot WhatsApp

Dedykowany bot WhatsApp dla grupy **House Mate App** z automatycznym grafikiem dyżurów sprzątania, rotacją członków oraz przypomnieniami wysyłanymi w **każdą niedzielę o 19:00 (strefa czasowa Europe/London)**.

---

## 🚀 Kolejka Dyżurów
Dyżury zmieniają się w cyklu rotacyjnym:
`Pawel` ➡️ `Merica` ➡️ `Ozgur` ➡️ `Kamil`

Stan kolejki zapisywany jest na bieżąco w pliku `data/state.json`.

---

## 💬 Komendy w Grupie WhatsApp

Wszystkie komendy zaczynają się od wykrzyknika `!`:

- `!duty` / `!kolejka` – Wyświetla obecnego dyżurnego oraz pełny grafik na dany tydzień.
- `!next` / `!nastepny` – Przechodzi ręcznie do następnej osoby w kolejce.
- `!prev` / `!poprzedni` – Cofa do poprzedniej osoby.
- `!skip` / `!pomin` – Pomija obecnego dyżurnego na dany tydzień.
- `!setduty <imię>` – Ustawia konkretną osobę jako dyżurnego (np. `!setduty Merica`).
- `!remind` – Wysyła oficjalne tygodniowe powiadomienie o dyżurze.
- `!status` – Pokazuje status połączenia bota i uptime.
- `!help` – Wyświetla listę dostępnych komend.

---

## 🛠️ Instalacja i Uruchomienie Lokalne

```bash
# 1. Instalacja zależności i build
npm run install (lub ./scripts/install.sh / .\scripts\install.ps1)

# 2. Uruchomienie bota
npm run dev
```

Po uruchomieniu w konsoli pojawi się **kod QR WhatsApp**. Zeskanuj go w aplikacji WhatsApp na telefonie:
`Ustawienia` ➡️ `Połączone urządzenia` ➡️ `Połącz urządzenie`.

Kod QR jest także dostępny w przeglądarce pod adresem: `http://localhost:3000/qr`.

---

## 🐳 Docker i Docker Compose

Najprostszym sposobem na uruchomienie bota w tle jest Docker:

```bash
# Uruchomienie kontenera w tle
docker compose up -d --build

# Sprawdzenie logów
docker compose logs -f
```

---

## 📜 Skrypty Pomocnicze

W folderze `scripts/` znajdują się przygotowane skrypty dla Linux/Mac i Windows PowerShell:

- `install.sh` / `install.ps1` – Instalacja zależności i kompilacja TypeScript.
- `test.sh` / `test.ps1` – Uruchomienie testów jednostkowych oraz weryfikacja builda.
- `status.sh` / `status.ps1` – Sprawdzenie stanu bota.
- `qr.sh` / `qr.ps1` – Pokazanie linku / kodu QR.
- `restart.sh` / `restart.ps1` – Restart usługi bota / kontenera.
- `backup.sh` / `backup.ps1` – Kopia zapasowa danych i sesji w archiwum ZIP / TAR.GZ.
- `deploy_oracle.sh` – Automatyczne wdrożenie na serwer Oracle Cloud VM przez SSH.

---

## ☁️ Wdrożenie na Oracle Cloud VM

Uzupełnij zmienne w pliku `.env`:
```env
ORACLE_VM_IP="twoje.ip.oracle.vm"
ORACLE_VM_USER="ubuntu"
ORACLE_SSH_KEY_PATH="path/to/key.key"
```

A następnie uruchom:
```bash
./scripts/deploy_oracle.sh
```

---

## ⚙️ Bezpieczeństwo
Sesje i pliki stanu (`data/`, `.env`) są ignorowane w systemie Git (`.gitignore`). Repozytorium nie zawiera żadnych poufnych danych ani tokenów.