# Apprendo

Interne Web-App zur Begleitung der Ausbildung (Wochenrückblicke, Semesterziele, Roadmap).

## Production

- App: https://apprendo.vercel.app
- Firebase Project: `apprendo-kfmn` (Auth + Firestore, Region `europe-west6`)

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- Firebase Auth + Cloud Firestore
- React Router
- Hosting: Vercel (Frontend + `/api` for invite emails) + Firebase (Auth/Firestore)
- Invite emails: Resend via Vercel Function `api/send-invite-email`

## Lokal starten

1. Abhängigkeiten: `npm install`
2. `.env` aus `.env.example` erstellen und Firebase-Werte eintragen
3. `npm run dev`

## Erst-Setup (Backend)

Firestoreregeln und Indexes deployen:

```bash
npx -y firebase-tools@latest deploy --only firestore,auth --project apprendo-kfmn
```

Schul-Roadmap seeden (Firebase CLI Login vorausgesetzt):

```bash
npx tsx scripts/seed/seed-school-roadmap-cli.ts
```

Benutzer einladen (Firebase CLI Login):

```bash
npx tsx scripts/invite-user-cli.ts --email coach@example.com --role coach --code coach-1
# Nach Coach-Signup die UID notieren, dann Lernende einladen:
npx tsx scripts/invite-user-cli.ts --email learner@example.com --role lernender --coachId <coachUid> --code learner-1
# Beobachter (nur Lesen) für einen oder mehrere Lernende:
npx tsx scripts/invite-user-cli.ts --email observer@example.com --role beobachter --learnerIds <learnerUid1,learnerUid2> --code obs-1
```

Rollen:

| Anzeige | Gespeichert | Rechte |
|---------|-------------|--------|
| **Coach** | `coach` | kann mehrere Lernende betreuen und Inhalte verwalten |
| **Lernender** | `learner` | eigener Bereich, Schreiben erlaubt |
| **Beobachter** | `observer` | kann mehrere Lernende **nur lesen** |

Signup unter `/signup` mit Einladungscode (oder Deep-Link aus der E-Mail:
`/signup?code=…&email=…`).

### Einladungs-E-Mails (Ops-Konsole)

Die Admin-Konsole (`/ops/invites`) erstellt Einladungen und sendet sie per E-Mail
über die Vercel Function [`api/send-invite-email.ts`](api/send-invite-email.ts) und [Resend](https://resend.com).

Einmalig in Vercel (Project → Settings → Environment Variables) setzen:

| Variable | Beispiel | Pflicht |
|----------|----------|---------|
| `RESEND_API_KEY` | `re_…` | ja |
| `FIREBASE_API_KEY` | gleicher Wert wie `VITE_FIREBASE_API_KEY` | ja |
| `FIREBASE_PROJECT_ID` | `apprendo-kfmn` | empfohlen |
| `APP_URL` | `https://apprendo.vercel.app` | nein (Default wie links) |
| `INVITE_FROM_EMAIL` | `Apprendo <einladungen@deine-domain.ch>` | nein (Default: Resend-Testabsender) |

```bash
# CLI-Alternative (nach vercel link):
npx vercel env add RESEND_API_KEY production
npx vercel env add FIREBASE_API_KEY production
npx vercel env add FIREBASE_PROJECT_ID production
```

1. Resend-Account anlegen, API-Key erzeugen, Absender-Domain verifizieren.
2. Env-Vars in Vercel setzen (Production + Preview).
3. Deploy (Push auf `main` oder `npx vercel --prod`).
4. Firestore-Regeln deployen (E-Mail-Status-Felder):

```bash
npx -y firebase-tools@latest deploy --only firestore:rules --project apprendo-kfmn
```

Danach in Ops → Einladungen: «Einladung erstellen & per E-Mail senden» bzw. «Erneut senden».

> Hinweis: Firebase Cloud Functions bräuchten den Blaze-Plan. Deshalb läuft der Versand über Vercel.

## MVP-Definition of Done

1. Coach und Lernender melden sich an
2. Coach öffnet einen Lernenden
3. Coach erstellt und aktiviert ein Semester
4. Coach erfasst Semesterziele
5. Lernender sieht die Ziele
6. Lernender speichert Wochenrückblick als Entwurf
7. Lernender reicht den Wochenrückblick ein
8. Coach liest den Wochenrückblick
9. Lernender markiert Roadmap-Themen als behandelt (auch über den Wochenrückblick)
10. Coach kann Roadmap-Themen ebenfalls als behandelt markieren
11. Coach pflegt betriebliche Roadmap-Themen
12. Coach beurteilt Semesterziele in fünf Stufen (A–E); Lernende und Beobachter sehen die Beurteilung nur
13. Coach schliesst ein Semester ab
14. Nicht beurteilte Ziele können ins Folgesemester übertragen werden
15. Vergangene Semester bleiben einsehbar
16. Beobachter sieht zugewiesene Lernende und Inhalte, ohne sie zu ändern