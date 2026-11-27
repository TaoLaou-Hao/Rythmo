/**
 * Rythmo - builds the feedback form for the current version.
 *
 * One single version is tested now, so there are no A-E version questions.
 *
 * How to use:
 *   1. Go to https://script.google.com and create a new project.
 *   2. Paste this whole file, then Save.
 *   3. Run createFormEN for the English form, or createFormFR for the French one.
 *      Run both if you want both.
 *   4. Allow access when Google asks (it is your own account).
 *   5. The links appear in Execution > log. Keep the public link.
 */

// Paste an existing spreadsheet id here so both forms write to it, one tab each.
// Leave empty to create a new spreadsheet each time.
var RESPONSES_SPREADSHEET_ID = '';

function createFormEN() { return build('en'); }
function createFormFR() { return build('fr'); }

// ---------- Wording: 'en' is the English form, 'fr' is the French one ----------
var WORDING = {
  en: {
    title: 'Rythmo — your feedback',
    intro: "Thanks for testing Rythmo, the app that organises your day as a student.\n\n" +
           "It takes about 3 minutes. Answers are anonymous and are only used to improve " +
           "the app.\n\nPlease do not share personal medical information.",
    thanks: 'Thank you. Your answers really help.',

    s1: 'How you used it',
    duree: 'How long did you use Rythmo?',
    duree_opts: ['Less than 5 minutes (a quick look)', '5 to 15 minutes', 'A few days', 'More than a week'],
    appareil: 'Mainly on which device?',
    appareil_opts: ['iPhone', 'Android', 'Computer', 'Several'],
    install: 'Did you install Rythmo on your home screen?',
    install_opts: ['Yes', 'No', 'I did not know I could'],

    s2: 'How useful is it?',
    utile: 'How useful is Rythmo for your daily life as a student?',
    utile_bas: 'Not useful at all', utile_haut: 'Extremely useful',
    aide: 'Rythmo helped me to…',
    aide_lignes: ['Go to bed at a more regular time', 'Know when to eat',
                  'Find time for sport', 'Plan my week around my classes',
                  'Drink more water'],
    aide_cols: ['Not at all', 'A little', 'Quite a lot', 'A lot', 'Did not try'],

    s3: 'Design and experience',
    accord: 'How much do you agree?',
    accord_lignes: ['The colours and style are pleasant', 'The text is easy to read',
                    'I found what I needed quickly', 'The tone and wording feel right for students',
                    'I would trust it with my routine'],
    accord_cols: ['Disagree', 'Rather disagree', 'Rather agree', 'Agree'],
    fonctions: 'Which features did you find most useful? (3 max)',
    fonctions_opts: ['The Now / Next view', 'The full day', 'The week',
                     'The water counter', 'The idea of the day', 'The evening check-in',
                     'The sleep chart', 'The calendar (.ics) import',
                     'The reminders', 'Notes and To-do'],
    change: 'What would you change first?',

    s4: 'Reminders',
    rm_on: 'Did you turn reminders on in Settings?',
    rm_on_opts: ['Yes', 'No', 'I tried, it did not work'],
    rm_recu: 'Did you get them while Rythmo was closed?',
    rm_recu_opts: ['Yes', 'No', 'I did not check', 'I did not turn reminders on'],
    rm_gene: 'The reminders were…',
    rm_gene_opts: ['At the right time', 'Too early or too late', 'Too many', 'Not enough', 'Never received'],

    s5: 'To finish',
    nps: 'How likely are you to recommend Rythmo to a student friend?',
    nps_bas: 'Not likely', nps_haut: 'Very likely',
    facile: 'How easy was it to use?',
    facile_bas: 'Hard', facile_haut: 'Very easy',
    encore: 'Would you use it again next week?',
    encore_opts: ['Yes', 'Maybe', 'No'],
    qui: 'You are…',
    qui_opts: ['Student at Aivancity', 'Student at another school or university', 'Other'],
    suite: 'What should we build next? (pick up to 3)',
    suite_aide: 'Pick what would help you most.',
    suite_opts: ['Dish ideas (simple recipes for my meal slots)',
                 'Types of food only (protein + vegetables + carbs), no recipes',
                 'Activity suggestions (sport, relaxation, social) for my free time',
                 'Homework and exam tracking',
                 'A month view',
                 'Share my plan with a friend'],
    mot: 'One last thing: an idea, a bug, a comment?'
  }
,

  fr: {
    title: 'Rythmo — ton avis',
    intro: "Merci de tester Rythmo, l'appli qui organise ta journée d'étudiant.\n\n" +
           "Ça prend environ 3 minutes. Les réponses sont anonymes et servent uniquement " +
           "à améliorer l'appli.\n\nNe partage aucune information médicale personnelle.",
    thanks: 'Merci. Tes réponses nous aident vraiment.',

    s1: 'Ton usage',
    duree: "Pendant combien de temps as-tu utilisé Rythmo ?",
    duree_opts: ['Moins de 5 minutes (découverte)', '5 à 15 minutes', 'Quelques jours', "Plus d'une semaine"],
    appareil: 'Sur quel appareil, surtout ?',
    appareil_opts: ['iPhone', 'Android', 'Ordinateur', 'Plusieurs'],
    install: "As-tu installé Rythmo sur ton écran d'accueil ?",
    install_opts: ['Oui', 'Non', 'Je ne savais pas que c’était possible'],

    s2: 'Est-ce utile ?',
    utile: "À quel point Rythmo t'est utile au quotidien, en tant qu'étudiant ?",
    utile_bas: 'Pas utile du tout', utile_haut: 'Extrêmement utile',
    aide: "Rythmo m'a aidé à…",
    aide_lignes: ['Me coucher à une heure plus régulière', 'Savoir quand manger',
                  'Trouver du temps pour le sport', 'Organiser ma semaine autour de mes cours',
                  "Boire plus d'eau"],
    aide_cols: ['Pas du tout', 'Un peu', 'Plutôt oui', 'Beaucoup', 'Pas essayé'],

    s3: 'Design et expérience',
    accord: "À quel point es-tu d'accord ?",
    accord_lignes: ['Les couleurs et le style sont agréables', 'Le texte est facile à lire',
                    "J'ai trouvé vite ce que je cherchais", 'Le ton et les mots conviennent à des étudiants',
                    'Je lui confierais ma routine'],
    accord_cols: ["Pas d'accord", "Plutôt pas d'accord", "Plutôt d'accord", "D'accord"],
    fonctions: "Quelles fonctions t'ont le plus servi ? (3 maximum)",
    fonctions_opts: ['La vue Maintenant / Ensuite', 'La journée complète', 'La semaine',
                     "Le compteur d'eau", "L'idée du jour", 'Le bilan du soir',
                     'La courbe de sommeil', "L'import d'agenda (.ics)",
                     'Les rappels', 'Les notes et le À faire'],
    change: "Qu'est-ce que tu changerais en premier ?",

    s4: 'Les rappels',
    rm_on: 'As-tu activé les rappels dans Réglages ?',
    rm_on_opts: ['Oui', 'Non', "J'ai essayé, ça n'a pas marché"],
    rm_recu: 'Les as-tu reçus alors que Rythmo était fermée ?',
    rm_recu_opts: ['Oui', 'Non', "Je n'ai pas vérifié", "Je n'ai pas activé les rappels"],
    rm_gene: 'Les rappels étaient…',
    rm_gene_opts: ['Au bon moment', 'Trop tôt ou trop tard', 'Trop nombreux', 'Pas assez nombreux', 'Pas reçus'],

    s5: 'Pour finir',
    nps: 'Quelle est la probabilité que tu recommandes Rythmo à un ami étudiant ?',
    nps_bas: 'Peu probable', nps_haut: 'Très probable',
    facile: "Est-ce que c'était facile à utiliser ?",
    facile_bas: 'Difficile', facile_haut: 'Très facile',
    encore: "L'utiliserais-tu encore la semaine prochaine ?",
    encore_opts: ['Oui', 'Peut-être', 'Non'],
    qui: 'Tu es…',
    qui_opts: ['Étudiant à Aivancity', 'Étudiant dans une autre école ou université', 'Autre'],
    suite: "Qu'est-ce qu'on devrait construire ensuite ? (3 maximum)",
    suite_aide: 'Choisis ce qui te servirait le plus.',
    suite_opts: ['Des idées de plats (recettes simples pour mes créneaux repas)',
                 "Seulement des types d'aliments (protéines + légumes + féculents), sans recette",
                 "Des suggestions d'activités (sport, détente, social) pour mon temps libre",
                 'Un suivi des devoirs et des examens',
                 'Une vue du mois',
                 'Partager mon planning avec un ami'],
    mot: 'Un dernier mot : une idée, un bug, un commentaire ?'
  }
};

// ---------- Build ----------

function build(language) {
  var L = WORDING[langue];
  var form = FormApp.create(L.title);

  form.setDescription(L.intro);
  form.setCollectEmail(false);
  form.setLimitOneResponsePerUser(false);
  form.setAllowResponseEdits(false);
  form.setProgressBar(true);
  form.setConfirmationMessage(L.thanks);

  // 1
  form.addPageBreakItem().setTitle(L.s1);
  choice(form, L.duree, L.duree_opts, true);
  choice(form, L.appareil, L.appareil_opts, true);
  choice(form, L.install, L.install_opts, true);

  // 2
  form.addPageBreakItem().setTitle(L.s2);
  scale(form, L.utile, 1, 10, L.utile_bas, L.utile_haut);
  grid(form, L.aide, L.aide_lignes, L.aide_cols);

  // 3
  form.addPageBreakItem().setTitle(L.s3);
  grid(form, L.accord, L.accord_lignes, L.accord_cols);
  form.addCheckboxItem().setTitle(L.fonctions).setChoiceValues(L.fonctions_opts);
  form.addParagraphTextItem().setTitle(L.change);

  // 4
  form.addPageBreakItem().setTitle(L.s4);
  choice(form, L.rm_on, L.rm_on_opts, true);
  choice(form, L.rm_recu, L.rm_recu_opts, true);
  choice(form, L.rm_gene, L.rm_gene_opts, false);

  // 5
  form.addPageBreakItem().setTitle(L.s5);
  scale(form, L.nps, 0, 10, L.nps_bas, L.nps_haut);
  scale(form, L.facile, 1, 5, L.facile_bas, L.facile_haut);
  choice(form, L.encore, L.encore_opts, true);
  choice(form, L.qui, L.qui_opts, true);
  form.addCheckboxItem().setTitle(L.suite).setHelpText(L.suite_aide)
      .setChoiceValues(L.suite_opts).showOtherOption(true);
  form.addParagraphTextItem().setTitle(L.mot);

  // Response destination
  var id = RESPONSES_SPREADSHEET_ID || SpreadsheetApp.create('Rythmo — ' + language.toUpperCase()).getId();
  form.setDestination(FormApp.DestinationType.SPREADSHEET, id);

  Logger.log('Public link: ' + form.getPublishedUrl());
  Logger.log('Edit link: ' + form.getEditUrl());
  Logger.log('Responses: https://docs.google.com/spreadsheets/d/' + id + '/edit');
  return form.getPublishedUrl();
}

function choice(form, title, options, required) {
  form.addMultipleChoiceItem().setTitle(title).setChoiceValues(options).setRequired(!!required);
}
function scale(form, title, low, high, lowLabel, highLabel) {
  form.addScaleItem().setTitle(title).setBounds(low, high).setLabels(lowLabel, highLabel).setRequired(true);
}
function grid(form, title, rows, cols) {
  form.addGridItem().setTitle(title).setRows(rows).setColumns(cols).setRequired(true);
}
