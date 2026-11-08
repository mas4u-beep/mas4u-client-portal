import React from 'react';

// Fill these in so the statement shows a real contact person (required by the
// Israeli accessibility regulations). While empty, a generic line is shown.
export const ACCESSIBILITY_CONTACT = {
  firm: 'ד.ש.ב חשבונאות ומיסים',
  coordinatorName: '',
  phone: '',
  email: '',
};

const LAST_UPDATED = '8 בנובמבר 2026';

export function AccessibilityStatement() {
  const c = ACCESSIBILITY_CONTACT;
  const hasContact = !!(c.coordinatorName || c.phone || c.email);
  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <main id="main" className="mx-auto max-w-3xl px-5 py-10 leading-relaxed">
        <a href="#/" className="text-primary underline underline-offset-4">← חזרה למערכת</a>
        <h1 className="mt-6 text-3xl font-extrabold text-primary">הצהרת נגישות</h1>
        <p className="mt-2 text-muted-foreground">עודכנה לאחרונה: {LAST_UPDATED}</p>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-bold">המחויבות שלנו</h2>
          <p>
            {c.firm} רואה חשיבות רבה בכך שכל לקוח ועובד יוכלו להשתמש במערכת באופן עצמאי ושוויוני,
            ובכלל זה אנשים עם מוגבלות. אנחנו פועלים להתאים את המערכת לתקן הישראלי ת״י 5568,
            המבוסס על הנחיות WCAG 2.1 ברמה AA, ולתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות).
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-bold">מה כבר נעשה</h2>
          <ul className="list-disc pr-6 space-y-1">
            <li>המערכת בנויה בעברית ובכיוון כתיבה מימין לשמאל.</li>
            <li>ניגודיות צבעים עומדת ביחס הנדרש (לפחות 4.5:1) בטקסטים.</li>
            <li>לכפתורים ושדות יש שמות נגישים, וכל שדות הטפסים מסומנים בתוויות.</li>
            <li>ברוב המסכים אפשר לנווט באמצעות המקלדת, עם סימון מיקוד גלוי.</li>
            <li>הממשק מותאם לגדלי מסך שונים, כולל טלפון נייד.</li>
            <li>בדקנו את המערכת בבדיקה אוטומטית (axe) על מסך הכניסה ולוח הבקרה, ולא נמצאו בהם ליקויים.</li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-bold">מגבלות ידועות</h2>
          <p>
            המערכת עדיין בפיתוח, ולא כל חלקיה נבדקו בבדיקה ידנית מלאה עם טכנולוגיות מסייעות
            (כגון קורא מסך). ייתכן שיימצאו עוד חלקים שאינם נגישים במלואם, בעיקר בטבלאות הנתונים
            ובמסכי הניהול המורכבים. בנוסף, מסמכים שמועלים למערכת על ידי לקוחות (כגון סריקות וקובצי PDF)
            אינם בהכרח נגישים, כי הם נוצרים מחוץ למערכת.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-bold">נתקלתם בבעיה? נשמח לשמוע</h2>
          <p>
            אם נתקלתם בקושי בשימוש במערכת, או שיש לכם הצעה לשיפור, אפשר לפנות אלינו ונטפל בכך בהקדם.
            כדאי לציין באיזה מסך הייתם ומה לא עבד.
          </p>
          {hasContact ? (
            <ul className="space-y-1">
              {c.coordinatorName && <li>רכז/ת נגישות: {c.coordinatorName}</li>}
              {c.phone && <li>טלפון: <a className="underline" href={`tel:${c.phone}`} dir="ltr">{c.phone}</a></li>}
              {c.email && <li>דוא״ל: <a className="underline" href={`mailto:${c.email}`} dir="ltr">{c.email}</a></li>}
            </ul>
          ) : (
            <p>אפשר לפנות למשרד בטלפון, בדוא״ל או דרך אחד מאנשי הצוות.</p>
          )}
        </section>
      </main>
    </div>
  );
}
