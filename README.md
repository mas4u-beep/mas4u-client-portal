# Mas4U — Client Portal / פורטל ניהול משרד

פורטל בעברית (RTL) לניהול לקוחות, מסמכים, משימות ותהליכי עבודה במשרד הנהלת חשבונות / מיסים.
בנוי ב‑React 19 + TypeScript + Vite, עם Tailwind CSS ו‑Shadcn UI.

## הרצה מקומית

דרישות מקדימות: Node.js 20+

```bash
npm install
npm run dev
```

האפליקציה תעלה בכתובת http://localhost:3000

### משתמשי דמו להתחברות

| תפקיד | אימייל | קוד אישי |
| --- | --- | --- |
| מנהל (Admin) | admin@mas4u.co.il | admin123 |
| לקוח | israel@example.com | 12345 |

## סקריפטים

- `npm run dev` — שרת פיתוח
- `npm run build` — בניית גרסת production לתיקיית `dist/`
- `npm run preview` — תצוגה מקומית של הבנייה
- `npm run lint` — בדיקת טיפוסים (tsc)

## פריסה (Deployment)

הפרויקט מוגדר לפריסה אוטומטית ל‑**GitHub Pages** דרך GitHub Actions
(ראה `.github/workflows/deploy.yml`). כל `push` לענף `main` בונה ומפרסם את האתר.

הפעלה חד‑פעמית: ב‑GitHub, תחת **Settings → Pages → Build and deployment → Source**,
בחר **GitHub Actions**.

## תכונות AI (אופציונלי)

הצ'אטבוט וסריקת המסמכים משתמשים ב‑Google Gemini. ללא מפתח API הם מושבתים בעדינות
ושאר האפליקציה עובדת כרגיל. כדי להפעיל אותם, הוסף ב‑GitHub סוד בשם `GEMINI_API_KEY`
(**Settings → Secrets and variables → Actions**).
שים לב: באתר ציבורי המפתח נחשף ב‑JS שנבנה.

## הערה על נתונים

כרגע הנתונים נשמרים מקומית בדפדפן (localStorage) עם נתוני דמו — אין שרת/מסד נתונים,
והמידע אינו משותף בין משתמשים. לשימוש אמיתי כתוכנת משרד רב‑משתמשית יש להוסיף
שרת ומסד נתונים.
