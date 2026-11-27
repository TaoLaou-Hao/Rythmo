/**
 * Rythmo — crée le formulaire de retour en français.
 *
 * Il reproduit question pour question le formulaire anglais, pour que les
 * réponses des deux langues restent comparables.
 *
 * Utilisation :
 *   1. Va sur https://script.google.com, Nouveau projet.
 *   2. Colle tout ce fichier, puis Enregistrer.
 *   3. Choisis la fonction creerFormulaireRythmoFR et clique Exécuter.
 *   4. Autorise l'accès quand Google le demande (c'est ton propre compte).
 *   5. Les deux liens s'affichent dans Exécution > journal. Garde le lien
 *      public : c'est celui à mettre dans l'appli.
 */

// ---------- Réglages ----------

// Garde les questions sur les versions A–E. Mets false si tu ne testes
// plus qu'une seule version : les questions 1, 2 et 8 disparaissent.
var POSER_QUESTIONS_VERSIONS = true;

// Garde dans la dernière question les deux options déjà livrées
// (rappels, export agenda). Mets false pour ne plus les proposer —
// mais les réponses ne seront plus comparables avec le formulaire anglais.
var GARDER_OPTIONS_DEJA_FAITES = true;

// Colle ici l'identifiant du classeur de réponses du formulaire anglais
// pour que les réponses françaises arrivent dans le même fichier, sur un
// autre onglet. L'identifiant est la partie entre /d/ et /edit de son URL.
// Laisse vide pour créer un nouveau classeur.
var ID_CLASSEUR_REPONSES = '';

// ---------- Script ----------

function creerFormulaireRythmoFR() {
  var form = FormApp.create('Test de Rythmo — formulaire de retour');

  form.setDescription(
    "Merci de tester Rythmo, l'appli qui organise ta journée d'étudiant.\n\n" +
    "Ça prend environ 3 minutes. Les réponses sont anonymes et servent " +
    "uniquement à améliorer l'appli.\n\n" +
    "Ne partage aucune information médicale personnelle."
  );

  form.setCollectEmail(false);
  form.setLimitOneResponsePerUser(false);
  form.setAllowResponseEdits(false);
  form.setProgressBar(true);
  form.setConfirmationMessage('Merci. Tes réponses nous aident vraiment.');

  var VERSIONS = ['A – Horizon', 'B – Ticket', 'C – Doux', 'D – Agenda', 'E – Batterie'];

  // --- Section 1 ---
  form.addPageBreakItem().setTitle('Ce que tu as testé');

  if (POSER_QUESTIONS_VERSIONS) {
    form.addMultipleChoiceItem()
      .setTitle('Quelle version as-tu testée en premier ?')
      .setChoiceValues(VERSIONS)
      .setRequired(true);

    form.addMultipleChoiceItem()
      .setTitle("As-tu essayé d'autres versions ?")
      .setChoiceValues(VERSIONS.concat(['Non, seulement la première']))
      .setRequired(true);
  }

  form.addMultipleChoiceItem()
    .setTitle("Pendant combien de temps l'as-tu utilisée ?")
    .setChoiceValues(['Moins de 5 minutes (démo)', '5 à 15 minutes', 'Quelques jours', "Plus d'une semaine"])
    .setRequired(true);

  // --- Section 2 ---
  form.addPageBreakItem().setTitle('Est-ce utile ?');

  form.addScaleItem()
    .setTitle("À quel point Rythmo t'est utile au quotidien, en tant qu'étudiant ?")
    .setBounds(1, 10)
    .setLabels('Pas utile du tout', 'Extrêmement utile')
    .setRequired(true);

  form.addGridItem()
    .setTitle("Rythmo m'a aidé à…")
    .setRows([
      'Me coucher à une heure plus régulière',
      'Savoir quand manger',
      'Trouver du temps pour le sport',
      'Organiser ma semaine autour de mes cours',
      "Boire plus d'eau"
    ])
    .setColumns(['Pas du tout', 'Un peu', 'Plutôt oui', 'Beaucoup', 'Pas essayé'])
    .setRequired(true);

  // --- Section 3 ---
  form.addPageBreakItem().setTitle('Design et expérience');

  form.addGridItem()
    .setTitle("Pour la version testée en premier, à quel point es-tu d'accord ?")
    .setRows([
      'Les couleurs et le style sont agréables',
      'Le texte est facile à lire',
      "J'ai trouvé vite ce que je cherchais",
      'Le ton et les mots conviennent à des étudiants',
      'Je lui confierais ma routine'
    ])
    .setColumns(["Pas d'accord", "Plutôt pas d'accord", "Plutôt d'accord", "D'accord"])
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle("Quelles fonctions t'ont le plus servi ? (3 maximum)")
    .setChoiceValues([
      "Heure d'extinction des lumières",
      'Vue de la journée',
      "Compteur d'eau",
      'Idée du jour',
      'Bilan du soir',
      'Courbe de sommeil sur 7 jours',
      "Import d'agenda (.ics)",
      'Bascule anglais / français'
    ]);

  if (POSER_QUESTIONS_VERSIONS) {
    form.addMultipleChoiceItem()
      .setTitle('Si tu as essayé plusieurs versions, laquelle garderais-tu ?')
      .setChoiceValues(VERSIONS.concat(["Je n'en ai essayé qu'une"]))
      .setRequired(true);
  }

  form.addParagraphTextItem()
    .setTitle("Pourquoi ? Qu'est-ce que tu changerais (couleurs, disposition, formulations) ?");

  // --- Section 4 ---
  form.addPageBreakItem().setTitle('Pour finir');

  form.addScaleItem()
    .setTitle('Quelle est la probabilité que tu recommandes Rythmo à un ami étudiant ?')
    .setBounds(0, 10)
    .setLabels('Peu probable', 'Très probable')
    .setRequired(true);

  form.addScaleItem()
    .setTitle("Est-ce que c'était facile à utiliser ?")
    .setBounds(1, 5)
    .setLabels('Difficile', 'Très facile')
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle("L'utiliserais-tu encore la semaine prochaine ?")
    .setChoiceValues(['Oui', 'Peut-être', 'Non'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Tu es…')
    .setChoiceValues(['Étudiant à Aivancity', 'Étudiant dans une autre école ou université', 'Autre'])
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('Un dernier mot : une idée, un bug, un commentaire ?');

  var aVenir = [
    'Des idées de plats (recettes simples pour mes créneaux repas)',
    'Seulement des types d’aliments (protéines + légumes + féculents), sans recette',
    "Des suggestions d'activités (sport, détente, social) pour mon temps libre",
    "Des notes : écrire librement ce que j'ai à faire, et l'appli les place ou me les rappelle"
  ];
  if (GARDER_OPTIONS_DEJA_FAITES) {
    aVenir.push('Des rappels / notifications');
    aVenir.push('Exporter mon planning vers mon agenda');
  }

  form.addCheckboxItem()
    .setTitle("Qu'est-ce qu'on devrait construire ensuite ? (3 maximum)")
    .setHelpText('Choisis ce qui te servirait le plus.')
    .setChoiceValues(aVenir)
    .showOtherOption(true);

  // --- Destination des réponses ---
  var idClasseur = ID_CLASSEUR_REPONSES;
  if (!idClasseur) {
    idClasseur = SpreadsheetApp.create('Rythmo — réponses (FR)').getId();
  }
  form.setDestination(FormApp.DestinationType.SPREADSHEET, idClasseur);

  // --- Liens ---
  var lienPublic = form.getPublishedUrl();
  Logger.log('Lien public (à mettre dans l’appli) : ' + lienPublic);
  Logger.log('Lien de modification : ' + form.getEditUrl());
  Logger.log('Réponses : https://docs.google.com/spreadsheets/d/' + idClasseur + '/edit');
  return lienPublic;
}
