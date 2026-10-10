# Cozumel · ספרדית מקסיקנית (אתר סטטי)

אתר פרטי ללימוד ספרדית מקסיקנית לדובר עברית. HTML/CSS/JS טהור, בלי שרת, בלי build, בלי מפתחות או סודות בקוד. כל הנתיבים יחסיים, ולכן עובד גם תחת תת-נתיב של GitHub Pages (`https://USER.github.io/REPO/`). התקדמות נשמרת ב-`localStorage` של הדפדפן (מפתח `cozumel.v1`). Service worker מאפשר שימוש לא מקוון אחרי ביקור ראשון.

## הרצה מקומית
```
cd cozumel-site
python3 -m http.server 8000     # ואז http://localhost:8000/
```
(פתיחה ישירה כ-`file://` לא תעבוד כי התוכן נטען ב-fetch.)

## מבנה
```
index.html            מעטפת + ניווט (ניתוב ב-hash: #/ #/lessons #/lesson/ID #/cards/ID #/quiz/ID #/review #/progress #/chat)
css/tokens.css        משתני עיצוב (מדריך הסגנון Tropical Leaf)
css/app.css           סגנונות, mobile-first, RTL עם תכונות לוגיות
js/app.js             לוגיקה | js/config.js הגדרות (ללא סודות) | sw.js אופליין
assets/               איורי SVG מהמעצבת (הטוקן הוא קישוט בלבד)
content/lessons.json  אינדקס שיעורים
content/lessons/*.json  שיעור אחד לקובץ (כרטיסיות + חידון)
content/images/*.svg  איור לכל כרטיסייה (viewBox 330x178; חסר = מציין מקום assets/scene.svg)
.github/workflows/pages.yml  פרסום ל-GitHub Pages
```

## סכמת התוכן
**`content/lessons.json`** (אינדקס): `{ version, sample (bool; true מציג באנר "תוכן דוגמה"), sample_note_he?, lessons: [ { id, order, level, title_he, topic, minutes, file } ] }` כאשר `file` יחסי ל-`content/`.

**`content/lessons/lesson-NN.json`**:
- שיעור: `id, order, topic_he, topic_es, level (A1), estimated_minutes, intro_he, cards[], quiz[]` (אופציונלי: `sample: true`).
- כרטיסייה: `id, es, transliteration_he, he, example_es, example_he, image (שם קובץ ב-content/images), mexico_specific (bool), note_he` (אם `mexico_specific` ההערה מוצגת כתגית "מקסיקו ספציפי", אחרת כ"שימו לב").
- שאלת חידון: `id, type` (`multiple_choice` | `fill_in`), `prompt_he`, `options` (רק multiple_choice; מעורבבות בכל הצגה), `answer`, `accepted_answers` (רק fill_in; השוואה ללא רגישות לאותיות רישיות וללא רווחים מיותרים), `explanation_he`, `card_id`.
- שדות `_he` מוצגים RTL; `es` ו-`example_es` בתוך `<span dir="ltr" lang="es-MX">`. השמעה: Web Speech API, `es-MX`.

הוספת שיעור: קובץ חדש ב-`content/lessons/` ושורה באינדקס.

## שיחה
שיחת AI הוסרה בשלב זה. #/chat הוא מסך "בקרוב" פשוט: בלי קלט, בלי הגדרות, בלי מפתחות ובלי קריאות רשת.

## פרסום ב-GitHub Pages
1. ליצור ריפו, לדחוף את תוכן התיקייה לענף `main`.
2. Settings → Pages → Source: **GitHub Actions**.
3. ה-workflow `.github/workflows/pages.yml` בודק תקינות JSON ומפרסם בכל push.
