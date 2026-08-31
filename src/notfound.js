import './styles/main.css';

/* The 404 carries no scene and no scroll system — it exists to get the
   visitor back into the site in one click. Only the two things that would
   otherwise be wrong are wired. */
const year = document.getElementById('footYear');
if (year) year.textContent = String(new Date().getFullYear());
