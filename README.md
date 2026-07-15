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
- Hosting: Vercel (Frontend) + Firebase (Auth/Firestore)

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
npx tsx scripts/invite-user-cli.ts --email learner@example.com --role learner --coachId <coachUid> --code learner-1
```

Signup unter `/signup` mit Einladungscode.

## MVP-Definition of Done

1. Coach und Lernender melden sich an
2. Coach öffnet einen Lernenden
3. Coach erstellt und aktiviert ein Semester
4. Coach erfasst Semesterziele
5. Lernender sieht die Ziele
6. Lernender speichert Wochenrückblick als Entwurf
7. Lernender reicht den Rückblick ein
8. Coach liest den Rückblick
9. Lernender markiert Roadmap-Themen als behandelt
10. Coach markiert und bestätigt Roadmap-Themen
11. Coach pflegt betriebliche Roadmap-Themen
12. Coach schliesst Semesterziele ab
13. Coach schliesst ein Semester ab
14. Offene Ziele können ins Folgesemester übertragen werden
15. Vergangene Semester bleiben einsehbar
