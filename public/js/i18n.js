/**
 * ExamRoadmap - Bilingual string layer (English default, Hindi supported)
 *
 * One dictionary drives the whole app: onboarding, dashboard chrome, the
 * roadmap, the study drawer and every toast. English is the default because
 * the app now opens to a mixed-medium audience; Hindi remains a first-class
 * bundle rather than a machine-translated afterthought.
 *
 * Adding a language later means adding one more bundle to `BUNDLES` and one
 * entry to `I18n.LANGS` — no call sites change.
 */
(function (global) {
  'use strict';

  var LANG_KEY = 'examroadmap_app_lang';
  var DEFAULT_LANG = 'en';

  var LANGS = [
    { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
    { code: 'hi', label: 'Hindi', native: 'हिंदी', flag: '🇮🇳' }
  ];

  var BUNDLES = {

    /* ============================== ENGLISH ============================== */
    en: {
      /* --- app chrome --- */
      'app.offline': '📴 You are offline — progress keeps saving on this device and syncs the moment you are back online.',
      'app.loadingRoadmap': 'Loading roadmap…',
      'app.switchExam': 'Switch',
      'app.switchExamTitle': 'Pick a different exam roadmap',
      'app.themeLight': 'Light',
      'app.themeDark': 'Dark',
      'app.themeToggle': 'Switch theme',
      'app.toastLight': '☀️ Light mode',
      'app.toastDark': '🌙 Dark mode',
      'app.install': '📲 Install App',
      'app.installTitle': 'Install this app',
      'app.installed': '📲 App installed!',
      'app.installHint': 'Choose "Add to Home Screen" from your browser menu to install.',
      'app.backOnline': '🌐 Back online — syncing',
      'app.wentOffline': '📴 Offline mode — your progress keeps saving on this device',
      'app.roadmapLoadFailed': 'Could not load the roadmap. Please check your connection.',

      /* --- sync / auth --- */
      'sync.local': 'Local mode',
      'sync.syncing': 'Syncing…',
      'sync.synced': 'Cloud synced ✓',
      'sync.connected': 'Cloud connected',
      'sync.status': 'Cloud sync status',
      'sync.login': '☁ Login / Sync',
      'sync.now': '⟳ Sync now',
      'sync.nowTitle': 'Save to the cloud right now',
      'sync.pushed': '✓ Progress synced to the cloud',
      'sync.pulled': '✓ Latest progress loaded from the cloud',
      'sync.expired': 'Session expired — please sign in again',
      'auth.student': 'Student',
      'auth.logout': 'Log out',
      'auth.tabLogin': 'Login',
      'auth.tabRegister': 'Sign Up',
      'auth.help': 'Creating an account keeps your progress safe in the cloud and available on any device.',
      'auth.username': 'Username',
      'auth.password': 'Password',
      'auth.yourName': 'Your name',
      'auth.usernamePh': 'e.g. exam_aspirant',
      'auth.namePh': 'e.g. Ravi Kumar',
      'auth.passwordMin': 'At least 4 characters',
      'auth.doLogin': '✓ Log in',
      'auth.doRegister': '✓ Create account',
      'auth.loggingIn': 'Logging in…',
      'auth.creating': 'Creating account…',
      'auth.cancel': 'Cancel',
      'auth.loginFailed': 'Login failed',
      'auth.registerFailed': 'Registration failed',
      'auth.welcome': '✓ Welcome, {name}!',
      'auth.loggedOut': 'You are logged out. Your progress is safe on this device.',

      /* --- progress card --- */
      'progress.heading': 'Overall Preparation Progress',
      'progress.headingSub': 'Live Progress & Weightage',
      'progress.completed': 'Completed Topics',
      'progress.inProgress': 'In Progress',
      'progress.highYield': 'High Yield Done',
      'progress.estMarks': 'Estimated Marks',
      'progress.totalRevisions': 'Total Revisions',
      'progress.marks': 'marks',

      /* --- timer --- */
      'timer.focus': 'Focus Session (Pomodoro)',
      'timer.stopwatch': 'Stopwatch (Open Study)',
      'timer.today': 'Today: {n} sessions',
      'timer.start': '▶ Start',
      'timer.pause': '⏸ Pause',
      'timer.break': 'Break 5',
      'timer.stopwatchBtn': 'Stopwatch',
      'timer.min': '{n} min',
      'timer.done': '🎉 Focus session complete! Take a short break.',
      'timer.focusStarted': '⏱ Focus session started: {topic}',

      /* --- toolbar --- */
      'toolbar.searchPh': 'Search topics, units or notes…',
      'toolbar.allPhases': 'All Phases',
      'toolbar.allPriority': 'All Priorities',
      'toolbar.high': '🔥 High-Yield',
      'toolbar.medium': '⚡ Medium',
      'toolbar.standard': '📌 Standard',
      'toolbar.allStatus': 'All Statuses',
      'toolbar.pending': 'Pending',
      'toolbar.statusInProgress': 'In Progress',
      'toolbar.statusCompleted': 'Completed',
      'toolbar.needsRevision': 'Revision Due',
      'toolbar.lowConfidence': 'Low Confidence (≤2★)',
      'toolbar.resetFilters': '↺ Filters',
      'toolbar.resetFiltersTitle': 'Clear filters',
      'toolbar.export': '⬇ Export',
      'toolbar.exportTitle': 'Download your progress',
      'toolbar.import': '⬆ Import',
      'toolbar.importTitle': 'Upload a progress file',
      'toolbar.reset': '🗑 Reset',
      'toolbar.resetTitle': 'Erase all progress',
      'toolbar.emptyFilter': '🔍 No topics match these filters. Try changing them.',

      /* --- import / export / reset --- */
      'io.exported': '⬇ Progress file downloaded',
      'io.imported': '⬆ Progress imported successfully',
      'io.importFailed': 'Import failed: {msg}',
      'io.invalidFile': 'Invalid file',
      'io.mismatch': 'This file belongs to "{title}", which is a different roadmap than the one open now.\n\nImport it into this roadmap anyway?',
      'reset.title': '⚠️ Reset all progress?',
      'reset.body': 'Every checkbox, revision, rating and note in this roadmap will be erased. This cannot be undone.<br><br>Progress on your other exams stays safe.',
      'reset.confirm': 'Yes, reset',
      'reset.done': 'All progress has been reset',

      /* --- roadmap --- */
      'roadmap.unitDone': '✓ Unit marked complete',
      'roadmap.unitReset': '↺ Unit reset (your notes are kept)',
      'projection.above': '✅ Your estimated score is above the passing mark ({marks})',
      'projection.gap': '📈 {gap} marks to go until the passing mark ({marks})',
      'roadmap.notStarted': 'Not started',
      'roadmap.ongoing': 'In progress',
      'roadmap.complete': 'Complete ✓',
      'roadmap.markAllDone': '✓ All done',
      'roadmap.markAllDoneTitle': 'Mark every topic in this unit complete',
      'roadmap.resetUnit': '↺ Reset',
      'roadmap.resetUnitTitle': 'Reset this unit',
      'roadmap.class': 'Class',
      'roadmap.classTitle': 'Watch lectures for this unit',
      'roadmap.study': '📖 Study',
      'roadmap.studyTitle': 'Open the study panel (revision, notes, video)',
      'roadmap.estWeightage': 'Estimated weightage',
      'roadmap.section': 'Section',
      'roadmap.unitCompletion': 'Unit completion',
      'roadmap.pyqHint': 'PYQ highlights',
      'roadmap.topicCheckbox': 'Mark topic complete',
      'roadmap.revisions': 'Revisions',
      'roadmap.confidence': 'Confidence',
      'roadmap.pyqSolved': 'PYQs solved',
      'roadmap.hasNotes': 'Has notes',
      'roadmap.questions': 'questions',
      'roadmap.minutes': 'minutes',
      'roadmap.passing': 'Passing',

      /* --- study drawer --- */
      'sd.panel': '📖 Study Panel',
      'sd.panelAria': 'Topic study panel',
      'sd.close': 'Close',
      'sd.pyqFocus': 'PYQ focus',
      'sd.status': 'Progress Status',
      'sd.markComplete': 'This topic is complete (Mark as completed)',
      'sd.spacedRep': '🔁 Spaced Repetition (3-Tier Revision)',
      'sd.confidenceRating': '⭐ Confidence Rating',
      'sd.clearRating': 'Clear rating',
      'sd.starAria': '{n} stars',
      'sd.pyqDone': '📝 I have solved the PYQs for this topic',
      'sd.notes': '🗒 Personal Notes',
      'sd.notesPh': 'Key formulae, definitions, PYQ pointers…',
      'sd.notesAuto': 'Saved automatically',
      'sd.notesSaving': 'Saving…',
      'sd.notesSaved': '✓ Saved',
      'sd.ytSearch': 'Find YouTube lectures',
      'sd.focusTimer': '⏱ Focus timer on this topic',
      'sd.revUpdated': '🔁 Revision updated',
      'sd.status.not_started': 'Not Started',
      'sd.status.in_progress': 'Reading',
      'sd.status.notes_done': 'Notes Done',
      'sd.status.mcqs_done': 'MCQs Solved',
      'sd.status.mastered': 'Mastered',
      'sd.rev1': 'Revision 1',
      'sd.rev2': 'Revision 2',
      'sd.rev3': 'Revision 3',
      'sd.after24h': 'after 24 hours',
      'sd.after7d': 'after 7 days',
      'sd.after30d': 'after 30 days',
      'sd.doneOn': 'Done {date} — click to undo',
      'sd.firstRevNow': 'Do your first revision now',
      'sd.completeFirst': 'Complete the topic first',
      'sd.revDueNow': '{label} is due now',
      'sd.revDaysLeft': '{label} — {n} days to go',
      'sd.allRevsDone': '🎉 All three revisions complete!',

      /* --- catalog --- */
      'catalog.title': '🎯 Choose an Exam Roadmap',
      'catalog.subtitle': 'Pick your exam — progress for each one is saved separately.',
      'catalog.searchPh': 'Search exams (STET, CTET, SSC, Boards…)',
      'catalog.all': 'All',
      'catalog.loading': 'Loading…',
      'catalog.loadFailed': 'Could not load the catalog.',
      'catalog.noneFound': 'No exams found. Try a different search.',
      'catalog.comingSoon': 'Coming soon',
      'catalog.unavailable': 'Not available',
      'catalog.current': '✓ Current roadmap',
      'catalog.continue': 'Continue →',
      'catalog.start': 'Start roadmap →',
      'catalog.topicsDone': '{n} topics complete',
      'catalog.notStarted': 'Not started yet',
      'catalog.loadingRoadmap': 'Loading roadmap…',
      'catalog.switched': '🎯 Roadmap switched: {title}',
      'catalog.switchFailed': 'Could not load the roadmap: {msg}',

      /* --- goal banner --- */
      'goal.button': '🎯 My Goal & Guide',
      'goal.buttonTitle': 'View or edit your goal, exam and study plan',
      'goal.greeting': 'Hi {name} 👋',
      'goal.greetingAnon': 'Your Goal',
      'goal.targetExam': 'Target Exam',
      'goal.medium': 'Exam Medium',
      'goal.daysLeft': 'Days Left',
      'goal.daysLeftUnit': 'days',
      'goal.examToday': 'Exam is today!',
      'goal.examPassed': 'Exam date passed',
      'goal.noDate': 'No date set',
      'goal.dailyTarget': "Today's Target",
      'goal.hoursUnit': 'hrs',
      'goal.pomodoros': 'Pomodoros',
      'goal.edit': 'Edit',
      'goal.targetScore': 'Target Score',

      /* --- exam medium --- */
      'medium.en': 'English Medium',
      'medium.hi': 'Hindi Medium',
      'medium.bilingual': 'Bilingual',
      'medium.enShort': 'English',
      'medium.hiShort': 'Hindi',
      'medium.bilingualShort': 'Bilingual',

      /* --- onboarding: shell --- */
      'ob.next': 'Continue →',
      'ob.back': '← Back',
      'ob.skip': 'Skip for now',
      'ob.step': 'Step {n} of {total}',
      'ob.close': 'Close setup',
      'ob.langPrompt': 'App language',
      'ob.required': 'Please make a selection to continue.',

      /* --- onboarding: step 1 --- */
      'ob.s1.title': 'Welcome to ExamRoadmap',
      'ob.s1.subtitle': "Let's build a study plan that fits your exam, your medium and your schedule. It takes under a minute.",
      'ob.s1.langLabel': 'Choose your app language',
      'ob.s1.langHelp': 'You can switch anytime from the header.',
      'ob.s1.nameLabel': 'What should we call you?',
      'ob.s1.namePh': 'Your first name',
      'ob.s1.stageLabel': 'Where are you in your preparation?',
      'ob.s1.beginner': 'Beginner',
      'ob.s1.beginnerDesc': 'Starting the syllabus fresh',
      'ob.s1.intermediate': 'Intermediate',
      'ob.s1.intermediateDesc': 'Some units already covered',
      'ob.s1.revision': 'Revision & Mocks',
      'ob.s1.revisionDesc': 'Syllabus done, polishing now',

      /* --- onboarding: step 2 --- */
      'ob.s2.title': 'Which exam are you preparing for?',
      'ob.s2.subtitle': 'Pick your target exam. You can add or switch roadmaps later without losing progress.',
      'ob.s2.allCategories': 'All',
      'ob.s2.soon': 'Coming soon',
      'ob.s2.marks': '{n} marks',
      'ob.s2.questions': '{n} questions',
      'ob.s2.mins': '{n} min',

      /* --- onboarding: step 3 --- */
      'ob.s3.title': 'Your exam medium & target date',
      'ob.s3.subtitle': 'This tailors your lecture searches and study material to the language you will actually write the exam in.',
      'ob.s3.mediumLabel': 'In which language / medium are you planning to appear for the exam?',
      'ob.s3.mediumEnDesc': 'Study material and lectures in English',
      'ob.s3.mediumHiDesc': 'पढ़ाई और लेक्चर हिंदी में',
      'ob.s3.mediumBiDesc': 'Mix of both, whichever explains it best',
      'ob.s3.dateLabel': 'When is your exam?',
      'ob.s3.dateHelp': 'Pick a quick option or choose an exact date.',
      'ob.s3.in30': 'In 30 days',
      'ob.s3.in60': 'In 60 days',
      'ob.s3.in90': 'In 90 days',
      'ob.s3.in180': 'In 6 months',
      'ob.s3.customDate': 'Or pick an exact date',

      /* --- onboarding: step 4 --- */
      'ob.s4.title': 'How much can you study each day?',
      'ob.s4.subtitle': 'Be honest — a plan you can keep beats an ambitious one you abandon.',
      'ob.s4.hoursLabel': 'Daily study hours',
      'ob.s4.hoursCasual': 'Alongside job or college',
      'ob.s4.hoursSerious': 'Serious daily grind',
      'ob.s4.hoursFull': 'Full-time preparation',
      'ob.s4.pomoLabel': 'Daily focus sessions (25 min each)',
      'ob.s4.pomoUnit': 'sessions',
      'ob.s4.pomoHelp': 'That is about {mins} minutes of deep focus per day.',
      'ob.s4.scoreLabel': 'What are you aiming for?',
      'ob.s4.scorePass': 'Clear the cutoff',
      'ob.s4.scorePassDesc': 'Safely above the passing mark',
      'ob.s4.scoreTop': 'Top score (80%+)',
      'ob.s4.scoreTopDesc': 'Competitive rank, merit list',

      /* --- onboarding: step 5 --- */
      'ob.s5.title': 'Your personalised strategy',
      'ob.s5.subtitle': 'Built from your date, your hours and the 80/20 weightage of {exam}.',
      'ob.s5.daysAvailable': 'Days available',
      'ob.s5.totalHours': 'Total study hours',
      'ob.s5.topicsPerWeek': 'Topics per week',
      'ob.s5.phase1': 'Phase 1 · Foundations',
      'ob.s5.phase1Desc': 'Build the base concepts so nothing later feels unfamiliar.',
      'ob.s5.phase2': 'Phase 2 · High-Yield 80/20',
      'ob.s5.phase2Desc': 'Hammer the units that carry the most marks per hour spent.',
      'ob.s5.phase3': 'Phase 3 · PYQ & Spaced Repetition',
      'ob.s5.phase3Desc': 'Lock it in with past papers and timed 24h → 7d → 30d revisions.',
      'ob.s5.days': '{n} days',
      'ob.s5.tightWarning': '⚠️ That is a tight window. We have front-loaded the high-yield units so you cover the most marks first.',
      'ob.s5.comfortable': '✅ Comfortable runway — you have room for full coverage plus three revision passes.',

      /* --- onboarding: step 6 --- */
      'ob.s6.title': 'Your study superpowers',
      'ob.s6.subtitle': 'Four things this app does that a paper timetable cannot.',
      'ob.s6.f1': '80/20 Weightage Intelligence',
      'ob.s6.f1Desc': 'Every unit is tagged with its real mark weight, so you always know what to study next for maximum return.',
      'ob.s6.f2': '3-Tier Spaced Repetition',
      'ob.s6.f2Desc': 'Each topic schedules revisions at 24 hours, 7 days and 30 days — the rhythm memory actually responds to.',
      'ob.s6.f3': 'YouTube Lecture Launcher',
      'ob.s6.f3Desc': 'One tap opens curated lecture searches for any topic, already tuned to your chosen exam medium.',
      'ob.s6.f4': 'Pomodoro Timer & Offline PWA',
      'ob.s6.f4Desc': 'Focus sessions, streak tracking, and full offline access once installed. Study on the train.',

      /* --- onboarding: step 7 --- */
      'ob.s7.title': 'You are all set, {name}!',
      'ob.s7.titleAnon': 'You are all set!',
      'ob.s7.subtitle': 'Your roadmap for {exam} is ready. Save it to the cloud, or jump straight in.',
      'ob.s7.summaryExam': 'Exam',
      'ob.s7.summaryMedium': 'Medium',
      'ob.s7.summaryDate': 'Target date',
      'ob.s7.summaryHours': 'Daily hours',
      'ob.s7.cloud': '☁ Save to cloud',
      'ob.s7.cloudDesc': 'Sync across devices, never lose progress.',
      'ob.s7.guest': '🚀 Start studying now',
      'ob.s7.guestDesc': 'Everything saves on this device. You can sync later.',
      'ob.launched': '🎉 Your roadmap is live. Let us get to work!',
      'ob.saved': '✓ Your goal and study plan are updated',

      /* --- misc --- */
      'common.optional': 'optional',
      'common.cancel': 'Cancel',
      'common.save': 'Save',
      'common.done': 'Done'
    },

    /* =============================== HINDI =============================== */
    hi: {
      /* --- app chrome --- */
      'app.offline': '📴 आप ऑफलाइन हैं — प्रगति इस डिवाइस पर सेव होती रहेगी और ऑनलाइन आते ही सिंक हो जाएगी।',
      'app.loadingRoadmap': 'रोडमैप लोड हो रहा है…',
      'app.switchExam': 'बदलें',
      'app.switchExamTitle': 'दूसरी परीक्षा का रोडमैप चुनें',
      'app.themeLight': 'लाइट',
      'app.themeDark': 'डार्क',
      'app.themeToggle': 'थीम बदलें',
      'app.toastLight': '☀️ लाइट मोड',
      'app.toastDark': '🌙 डार्क मोड',
      'app.install': '📲 ऐप इंस्टॉल',
      'app.installTitle': 'ऐप इंस्टॉल करें',
      'app.installed': '📲 ऐप इंस्टॉल हो गया!',
      'app.installHint': 'इंस्टॉल करने हेतु ब्राउज़र मेन्यू से "Add to Home Screen" चुनें',
      'app.backOnline': '🌐 फिर से ऑनलाइन — सिंक हो रहा है',
      'app.wentOffline': '📴 ऑफलाइन मोड — प्रगति इस डिवाइस पर सेव होती रहेगी',
      'app.roadmapLoadFailed': 'रोडमैप लोड नहीं हो सका। कृपया इंटरनेट जांचें।',

      /* --- sync / auth --- */
      'sync.local': 'लोकल मोड',
      'sync.syncing': 'सिंक हो रहा है…',
      'sync.synced': 'क्लाउड सिंक ✓',
      'sync.connected': 'क्लाउड जुड़ा',
      'sync.status': 'क्लाउड सिंक स्थिति',
      'sync.login': '☁ लॉगिन / सिंक',
      'sync.now': '⟳ सिंक करें',
      'sync.nowTitle': 'तुरंत क्लाउड पर सेव करें',
      'sync.pushed': '✓ प्रगति क्लाउड पर सिंक हुई',
      'sync.pulled': '✓ क्लाउड से नवीनतम प्रगति लोड हुई',
      'sync.expired': 'सत्र समाप्त — कृपया पुनः लॉगिन करें',
      'auth.student': 'छात्र',
      'auth.logout': 'लॉगआउट',
      'auth.tabLogin': 'लॉगिन',
      'auth.tabRegister': 'नया खाता',
      'auth.help': 'खाता बनाने पर आपकी प्रगति क्लाउड पर सुरक्षित रहती है और किसी भी डिवाइस से खुल जाती है।',
      'auth.username': 'यूज़रनेम',
      'auth.password': 'पासवर्ड',
      'auth.yourName': 'आपका नाम',
      'auth.usernamePh': 'उदा. exam_aspirant',
      'auth.namePh': 'उदा. रवि कुमार',
      'auth.passwordMin': 'न्यूनतम 4 अक्षर',
      'auth.doLogin': '✓ लॉगिन करें',
      'auth.doRegister': '✓ खाता बनाएं',
      'auth.loggingIn': 'लॉगिन हो रहा है…',
      'auth.creating': 'खाता बन रहा है…',
      'auth.cancel': 'रद्द करें',
      'auth.loginFailed': 'लॉगिन विफल',
      'auth.registerFailed': 'रजिस्ट्रेशन विफल',
      'auth.welcome': '✓ स्वागत है, {name}!',
      'auth.loggedOut': 'आप लॉगआउट हो गए। प्रगति इस डिवाइस पर सुरक्षित है।',

      /* --- progress card --- */
      'progress.heading': 'कुल तैयारी प्रगति',
      'progress.headingSub': 'लाइव प्रगति एवं वेटेज',
      'progress.completed': 'पूर्ण टॉपिक्स',
      'progress.inProgress': 'प्रगति पर',
      'progress.highYield': 'हाई-यील्ड पूर्ण',
      'progress.estMarks': 'अनुमानित अंक',
      'progress.totalRevisions': 'कुल रिवीजन',
      'progress.marks': 'अंक',

      /* --- timer --- */
      'timer.focus': 'फोकस सेशन (Pomodoro)',
      'timer.stopwatch': 'स्टॉपवॉच (Open Study)',
      'timer.today': 'आज: {n} सेशन',
      'timer.start': '▶ शुरू करें',
      'timer.pause': '⏸ रोकें',
      'timer.break': 'ब्रेक 5',
      'timer.stopwatchBtn': 'स्टॉपवॉच',
      'timer.min': '{n} मि',
      'timer.done': '🎉 फोकस सेशन पूरा हुआ! थोड़ा ब्रेक लें।',
      'timer.focusStarted': '⏱ फोकस सेशन शुरू: {topic}',

      /* --- toolbar --- */
      'toolbar.searchPh': 'टॉपिक, यूनिट या नोट्स में खोजें…',
      'toolbar.allPhases': 'सभी चरण',
      'toolbar.allPriority': 'सभी प्राथमिकता',
      'toolbar.high': '🔥 हाई-यील्ड',
      'toolbar.medium': '⚡ मीडियम',
      'toolbar.standard': '📌 स्टैंडर्ड',
      'toolbar.allStatus': 'सभी स्थिति',
      'toolbar.pending': 'बाकी है',
      'toolbar.statusInProgress': 'प्रगति पर',
      'toolbar.statusCompleted': 'पूर्ण',
      'toolbar.needsRevision': 'रिवीजन बाकी',
      'toolbar.lowConfidence': 'कम कॉन्फिडेंस (≤2★)',
      'toolbar.resetFilters': '↺ फिल्टर',
      'toolbar.resetFiltersTitle': 'फिल्टर हटाएं',
      'toolbar.export': '⬇ एक्सपोर्ट',
      'toolbar.exportTitle': 'प्रगति डाउनलोड करें',
      'toolbar.import': '⬆ इम्पोर्ट',
      'toolbar.importTitle': 'प्रगति फाइल अपलोड करें',
      'toolbar.reset': '🗑 रीसेट',
      'toolbar.resetTitle': 'सारी प्रगति मिटाएं',
      'toolbar.emptyFilter': '🔍 इन फिल्टर्स से कोई टॉपिक नहीं मिला। फिल्टर बदलकर देखें।',

      /* --- import / export / reset --- */
      'io.exported': '⬇ प्रगति फाइल डाउनलोड हुई',
      'io.imported': '⬆ प्रगति सफलतापूर्वक इम्पोर्ट हुई',
      'io.importFailed': 'इम्पोर्ट विफल: {msg}',
      'io.invalidFile': 'अमान्य फाइल',
      'io.mismatch': 'यह फाइल "{title}" की है, जबकि वर्तमान रोडमैप अलग है।\n\nफिर भी इसी रोडमैप में इम्पोर्ट करें?',
      'reset.title': '⚠️ सारी प्रगति रीसेट करें?',
      'reset.body': 'इस रोडमैप के सभी चेकबॉक्स, रिवीजन, रेटिंग और नोट्स मिट जाएंगे। यह वापस नहीं किया जा सकता।<br><br>अन्य परीक्षाओं की प्रगति सुरक्षित रहेगी।',
      'reset.confirm': 'हाँ, रीसेट करें',
      'reset.done': 'सभी प्रगति रीसेट कर दी गई',

      /* --- roadmap --- */
      'roadmap.unitDone': '✓ यूनिट पूर्ण चिह्नित की गई',
      'roadmap.unitReset': '↺ यूनिट रीसेट हुई (नोट्स सुरक्षित हैं)',
      'projection.above': '✅ अनुमानित स्कोर उत्तीर्ण अंक ({marks}) से ऊपर है',
      'projection.gap': '📈 उत्तीर्ण अंक ({marks}) तक {gap} अंक शेष',
      'roadmap.notStarted': 'शुरू नहीं',
      'roadmap.ongoing': 'जारी है',
      'roadmap.complete': 'पूर्ण ✓',
      'roadmap.markAllDone': '✓ सब पूर्ण',
      'roadmap.markAllDoneTitle': 'सभी टॉपिक पूर्ण करें',
      'roadmap.resetUnit': '↺ रीसेट',
      'roadmap.resetUnitTitle': 'यूनिट रीसेट करें',
      'roadmap.class': 'क्लास',
      'roadmap.classTitle': 'यूनिट लेक्चर देखें',
      'roadmap.study': '📖 स्टडी',
      'roadmap.studyTitle': 'स्टडी पैनल खोलें (रिवीजन, नोट्स, वीडियो)',
      'roadmap.estWeightage': 'अनुमानित वेटेज',
      'roadmap.section': 'खंड',
      'roadmap.unitCompletion': 'यूनिट पूर्णता',
      'roadmap.pyqHint': 'PYQ मुख्य बिंदु',
      'roadmap.topicCheckbox': 'टॉपिक पूर्ण चिह्नित करें',
      'roadmap.revisions': 'रिवीजन',
      'roadmap.confidence': 'कॉन्फिडेंस',
      'roadmap.pyqSolved': 'PYQ हल किए',
      'roadmap.hasNotes': 'नोट्स मौजूद',
      'roadmap.questions': 'प्रश्न',
      'roadmap.minutes': 'मिनट',
      'roadmap.passing': 'उत्तीर्ण',

      /* --- study drawer --- */
      'sd.panel': '📖 स्टडी पैनल',
      'sd.panelAria': 'टॉपिक स्टडी पैनल',
      'sd.close': 'बंद करें',
      'sd.pyqFocus': 'PYQ फोकस',
      'sd.status': 'प्रगति स्थिति',
      'sd.markComplete': 'यह टॉपिक पूर्ण है',
      'sd.spacedRep': '🔁 स्पेस्ड रिपिटीशन (3-Tier Revision)',
      'sd.confidenceRating': '⭐ कॉन्फिडेंस रेटिंग',
      'sd.clearRating': 'रेटिंग हटाएं',
      'sd.starAria': '{n} स्टार',
      'sd.pyqDone': '📝 इस टॉपिक के PYQ हल कर लिए हैं',
      'sd.notes': '🗒 व्यक्तिगत नोट्स',
      'sd.notesPh': 'महत्वपूर्ण सूत्र, परिभाषाएं, PYQ बिंदु…',
      'sd.notesAuto': 'स्वतः सहेजा जाता है',
      'sd.notesSaving': 'सहेजा जा रहा है…',
      'sd.notesSaved': '✓ सहेजा गया',
      'sd.ytSearch': 'YouTube लेक्चर खोजें',
      'sd.focusTimer': '⏱ इस टॉपिक पर फोकस टाइमर',
      'sd.revUpdated': '🔁 रिवीजन अपडेट हुआ',
      'sd.status.not_started': 'शुरू नहीं',
      'sd.status.in_progress': 'अध्ययन जारी',
      'sd.status.notes_done': 'नोट्स तैयार',
      'sd.status.mcqs_done': 'MCQs अभ्यास',
      'sd.status.mastered': 'कंठस्थ / पूर्ण',
      'sd.rev1': 'रिवीजन 1',
      'sd.rev2': 'रिवीजन 2',
      'sd.rev3': 'रिवीजन 3',
      'sd.after24h': '24 घंटे बाद',
      'sd.after7d': '7 दिन बाद',
      'sd.after30d': '30 दिन बाद',
      'sd.doneOn': 'पूर्ण {date} — हटाने हेतु क्लिक करें',
      'sd.firstRevNow': 'पहला रिवीजन अब करें',
      'sd.completeFirst': 'पहले टॉपिक पूरा करें',
      'sd.revDueNow': '{label} अब देय है',
      'sd.revDaysLeft': '{label} — {n} दिन शेष',
      'sd.allRevsDone': '🎉 तीनों रिवीजन पूर्ण!',

      /* --- catalog --- */
      'catalog.title': '🎯 परीक्षा रोडमैप चुनें',
      'catalog.subtitle': 'अपनी परीक्षा चुनें — हर परीक्षा की प्रगति अलग-अलग सुरक्षित रहती है।',
      'catalog.searchPh': 'परीक्षा खोजें (STET, CTET, SSC, बोर्ड…)',
      'catalog.all': 'सभी',
      'catalog.loading': 'लोड हो रहा है…',
      'catalog.loadFailed': 'कैटलॉग लोड नहीं हो सका।',
      'catalog.noneFound': 'कोई परीक्षा नहीं मिली। खोज बदलकर देखें।',
      'catalog.comingSoon': 'जल्द आ रहा है',
      'catalog.unavailable': 'उपलब्ध नहीं',
      'catalog.current': '✓ वर्तमान रोडमैप',
      'catalog.continue': 'जारी रखें →',
      'catalog.start': 'रोडमैप शुरू करें →',
      'catalog.topicsDone': '{n} टॉपिक पूर्ण',
      'catalog.notStarted': 'अभी शुरू नहीं किया',
      'catalog.loadingRoadmap': 'रोडमैप लोड हो रहा है…',
      'catalog.switched': '🎯 रोडमैप बदला: {title}',
      'catalog.switchFailed': 'रोडमैप लोड नहीं हो सका: {msg}',

      /* --- goal banner --- */
      'goal.button': '🎯 मेरा लक्ष्य एवं गाइड',
      'goal.buttonTitle': 'अपना लक्ष्य, परीक्षा और अध्ययन योजना देखें या बदलें',
      'goal.greeting': 'नमस्ते {name} 👋',
      'goal.greetingAnon': 'आपका लक्ष्य',
      'goal.targetExam': 'लक्ष्य परीक्षा',
      'goal.medium': 'परीक्षा माध्यम',
      'goal.daysLeft': 'शेष दिन',
      'goal.daysLeftUnit': 'दिन',
      'goal.examToday': 'परीक्षा आज है!',
      'goal.examPassed': 'परीक्षा तिथि निकल गई',
      'goal.noDate': 'तिथि तय नहीं',
      'goal.dailyTarget': 'आज का लक्ष्य',
      'goal.hoursUnit': 'घंटे',
      'goal.pomodoros': 'पोमोडोरो',
      'goal.edit': 'बदलें',
      'goal.targetScore': 'लक्ष्य स्कोर',

      /* --- exam medium --- */
      'medium.en': 'अंग्रेज़ी माध्यम',
      'medium.hi': 'हिंदी माध्यम',
      'medium.bilingual': 'द्विभाषी',
      'medium.enShort': 'अंग्रेज़ी',
      'medium.hiShort': 'हिंदी',
      'medium.bilingualShort': 'द्विभाषी',

      /* --- onboarding: shell --- */
      'ob.next': 'आगे बढ़ें →',
      'ob.back': '← पीछे',
      'ob.skip': 'अभी छोड़ें',
      'ob.step': 'चरण {n} / {total}',
      'ob.close': 'सेटअप बंद करें',
      'ob.langPrompt': 'ऐप भाषा',
      'ob.required': 'आगे बढ़ने हेतु एक विकल्प चुनें।',

      /* --- onboarding: step 1 --- */
      'ob.s1.title': 'ExamRoadmap में आपका स्वागत है',
      'ob.s1.subtitle': 'आइए आपकी परीक्षा, माध्यम और समय के अनुसार अध्ययन योजना बनाएं। इसमें एक मिनट से भी कम लगेगा।',
      'ob.s1.langLabel': 'ऐप की भाषा चुनें',
      'ob.s1.langHelp': 'आप इसे कभी भी हेडर से बदल सकते हैं।',
      'ob.s1.nameLabel': 'हम आपको किस नाम से बुलाएं?',
      'ob.s1.namePh': 'आपका पहला नाम',
      'ob.s1.stageLabel': 'आपकी तैयारी किस स्तर पर है?',
      'ob.s1.beginner': 'शुरुआती',
      'ob.s1.beginnerDesc': 'सिलेबस अभी शुरू कर रहे हैं',
      'ob.s1.intermediate': 'मध्यम स्तर',
      'ob.s1.intermediateDesc': 'कुछ यूनिट पूरी हो चुकी हैं',
      'ob.s1.revision': 'रिवीजन एवं मॉक',
      'ob.s1.revisionDesc': 'सिलेबस पूरा, अब अभ्यास',

      /* --- onboarding: step 2 --- */
      'ob.s2.title': 'आप किस परीक्षा की तैयारी कर रहे हैं?',
      'ob.s2.subtitle': 'अपनी लक्ष्य परीक्षा चुनें। बाद में बिना प्रगति खोए रोडमैप बदल भी सकते हैं।',
      'ob.s2.allCategories': 'सभी',
      'ob.s2.soon': 'जल्द आ रहा है',
      'ob.s2.marks': '{n} अंक',
      'ob.s2.questions': '{n} प्रश्न',
      'ob.s2.mins': '{n} मिनट',

      /* --- onboarding: step 3 --- */
      'ob.s3.title': 'आपका परीक्षा माध्यम एवं लक्ष्य तिथि',
      'ob.s3.subtitle': 'इससे आपके लेक्चर और अध्ययन सामग्री उसी भाषा में मिलेंगे जिसमें आप परीक्षा देंगे।',
      'ob.s3.mediumLabel': 'आप परीक्षा किस भाषा / माध्यम में देने की योजना बना रहे हैं?',
      'ob.s3.mediumEnDesc': 'अध्ययन सामग्री एवं लेक्चर अंग्रेज़ी में',
      'ob.s3.mediumHiDesc': 'पढ़ाई और लेक्चर हिंदी में',
      'ob.s3.mediumBiDesc': 'दोनों का मिश्रण, जो बेहतर समझ आए',
      'ob.s3.dateLabel': 'आपकी परीक्षा कब है?',
      'ob.s3.dateHelp': 'त्वरित विकल्प चुनें या सटीक तिथि डालें।',
      'ob.s3.in30': '30 दिन में',
      'ob.s3.in60': '60 दिन में',
      'ob.s3.in90': '90 दिन में',
      'ob.s3.in180': '6 महीने में',
      'ob.s3.customDate': 'या सटीक तिथि चुनें',

      /* --- onboarding: step 4 --- */
      'ob.s4.title': 'आप रोज़ कितना पढ़ सकते हैं?',
      'ob.s4.subtitle': 'ईमानदारी से चुनें — जो योजना निभा सकें वह महत्वाकांक्षी योजना से बेहतर है।',
      'ob.s4.hoursLabel': 'प्रतिदिन अध्ययन घंटे',
      'ob.s4.hoursCasual': 'नौकरी या कॉलेज के साथ',
      'ob.s4.hoursSerious': 'गंभीर दैनिक अभ्यास',
      'ob.s4.hoursFull': 'पूर्णकालिक तैयारी',
      'ob.s4.pomoLabel': 'प्रतिदिन फोकस सेशन (25 मिनट प्रत्येक)',
      'ob.s4.pomoUnit': 'सेशन',
      'ob.s4.pomoHelp': 'यानी रोज़ लगभग {mins} मिनट गहन फोकस।',
      'ob.s4.scoreLabel': 'आपका लक्ष्य क्या है?',
      'ob.s4.scorePass': 'कटऑफ पार करना',
      'ob.s4.scorePassDesc': 'उत्तीर्ण अंक से सुरक्षित ऊपर',
      'ob.s4.scoreTop': 'टॉप स्कोर (80%+)',
      'ob.s4.scoreTopDesc': 'प्रतिस्पर्धी रैंक, मेरिट सूची',

      /* --- onboarding: step 5 --- */
      'ob.s5.title': 'आपकी व्यक्तिगत रणनीति',
      'ob.s5.subtitle': 'आपकी तिथि, घंटों और {exam} के 80/20 वेटेज के आधार पर।',
      'ob.s5.daysAvailable': 'उपलब्ध दिन',
      'ob.s5.totalHours': 'कुल अध्ययन घंटे',
      'ob.s5.topicsPerWeek': 'साप्ताहिक टॉपिक',
      'ob.s5.phase1': 'चरण 1 · आधारशिला',
      'ob.s5.phase1Desc': 'मूल अवधारणाएं मजबूत करें ताकि आगे कुछ अनजाना न लगे।',
      'ob.s5.phase2': 'चरण 2 · हाई-यील्ड 80/20',
      'ob.s5.phase2Desc': 'उन यूनिट्स पर जोर जो प्रति घंटे सबसे ज्यादा अंक देती हैं।',
      'ob.s5.phase3': 'चरण 3 · PYQ एवं स्पेस्ड रिपिटीशन',
      'ob.s5.phase3Desc': 'पिछले प्रश्नपत्रों और 24घं → 7दि → 30दि रिवीजन से पक्का करें।',
      'ob.s5.days': '{n} दिन',
      'ob.s5.tightWarning': '⚠️ समय थोड़ा कम है। हमने हाई-यील्ड यूनिट्स पहले रखी हैं ताकि ज्यादा अंक पहले सुरक्षित हों।',
      'ob.s5.comfortable': '✅ पर्याप्त समय — पूरा सिलेबस और तीन रिवीजन आराम से हो जाएंगे।',

      /* --- onboarding: step 6 --- */
      'ob.s6.title': 'आपकी अध्ययन महाशक्तियां',
      'ob.s6.subtitle': 'चार चीजें जो यह ऐप करता है और कागज़ी टाइमटेबल नहीं।',
      'ob.s6.f1': '80/20 वेटेज इंटेलिजेंस',
      'ob.s6.f1Desc': 'हर यूनिट पर उसका वास्तविक अंक-भार अंकित है, ताकि पता रहे कि अधिकतम लाभ हेतु आगे क्या पढ़ें।',
      'ob.s6.f2': '3-स्तरीय स्पेस्ड रिपिटीशन',
      'ob.s6.f2Desc': 'हर टॉपिक के रिवीजन 24 घंटे, 7 दिन और 30 दिन पर तय होते हैं — वही लय जिस पर स्मृति टिकती है।',
      'ob.s6.f3': 'YouTube लेक्चर लॉन्चर',
      'ob.s6.f3Desc': 'एक टैप में किसी भी टॉपिक के चुनिंदा लेक्चर खुलते हैं, वह भी आपके परीक्षा माध्यम के अनुसार।',
      'ob.s6.f4': 'पोमोडोरो टाइमर एवं ऑफलाइन PWA',
      'ob.s6.f4Desc': 'फोकस सेशन, स्ट्रीक ट्रैकिंग और इंस्टॉल के बाद पूर्ण ऑफलाइन उपयोग। सफर में भी पढ़ें।',

      /* --- onboarding: step 7 --- */
      'ob.s7.title': 'सब तैयार है, {name}!',
      'ob.s7.titleAnon': 'सब तैयार है!',
      'ob.s7.subtitle': '{exam} हेतु आपका रोडमैप तैयार है। इसे क्लाउड पर सेव करें या सीधे शुरू करें।',
      'ob.s7.summaryExam': 'परीक्षा',
      'ob.s7.summaryMedium': 'माध्यम',
      'ob.s7.summaryDate': 'लक्ष्य तिथि',
      'ob.s7.summaryHours': 'दैनिक घंटे',
      'ob.s7.cloud': '☁ क्लाउड पर सेव करें',
      'ob.s7.cloudDesc': 'सभी डिवाइस पर सिंक, प्रगति कभी न खोएं।',
      'ob.s7.guest': '🚀 अभी पढ़ाई शुरू करें',
      'ob.s7.guestDesc': 'सब कुछ इस डिवाइस पर सेव होगा। बाद में सिंक कर सकते हैं।',
      'ob.launched': '🎉 आपका रोडमैप तैयार है। चलिए शुरू करते हैं!',
      'ob.saved': '✓ आपका लक्ष्य एवं अध्ययन योजना अपडेट हुई',

      /* --- misc --- */
      'common.optional': 'वैकल्पिक',
      'common.cancel': 'रद्द करें',
      'common.save': 'सेव करें',
      'common.done': 'पूर्ण'
    }
  };

  var I18n = {
    LANGS: LANGS,
    DEFAULT_LANG: DEFAULT_LANG,
    LANG_KEY: LANG_KEY,
    lang: DEFAULT_LANG,
    _listeners: []
  };

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  I18n.isSupported = function (code) {
    return !!(code && BUNDLES[code]);
  };

  I18n.load = function () {
    var saved = safeGet(LANG_KEY);
    I18n.lang = I18n.isSupported(saved) ? saved : DEFAULT_LANG;
    return I18n.lang;
  };

  I18n.setLang = function (code, silent) {
    if (!I18n.isSupported(code) || code === I18n.lang) return false;
    I18n.lang = code;
    try { localStorage.setItem(LANG_KEY, code); } catch (e) {}
    document.documentElement.setAttribute('lang', code);
    if (!silent) I18n.emit();
    return true;
  };

  I18n.onChange = function (fn) { I18n._listeners.push(fn); };

  I18n.emit = function () {
    I18n._listeners.forEach(function (fn) {
      try { fn(I18n.lang); } catch (e) { console.error('i18n listener error', e); }
    });
  };

  /**
   * Translate a key, interpolating {placeholders}.
   * Falls back to English, then to the key itself, so a missing string is
   * visible in development but never blanks out the UI in production.
   */
  I18n.t = function (key, vars) {
    var bundle = BUNDLES[I18n.lang] || BUNDLES[DEFAULT_LANG];
    var str = bundle[key];
    if (str == null) str = BUNDLES[DEFAULT_LANG][key];
    if (str == null) return key;
    if (!vars) return str;
    return str.replace(/\{(\w+)\}/g, function (m, name) {
      return vars[name] != null ? vars[name] : m;
    });
  };

  /**
   * Pick the language-appropriate side of a bilingual catalog record.
   * The catalog stores Hindi in `title` and English in `titleEn`, so in
   * English we prefer `titleEn` and fall back gracefully when it is absent.
   */
  I18n.pick = function (obj, hiField, enField) {
    if (!obj) return '';
    var hi = obj[hiField];
    var en = obj[enField];
    if (I18n.lang === 'en') return en || hi || '';
    return hi || en || '';
  };

  I18n.examTitle = function (exam) {
    return I18n.pick(exam, 'title', 'titleEn');
  };

  I18n.categoryName = function (cat) {
    if (!cat) return '';
    return I18n.lang === 'en' ? (cat.name || cat.nameHi || '') : (cat.nameHi || cat.name || '');
  };

  /** Locale tag for Date/Number formatting. */
  I18n.locale = function () {
    return I18n.lang === 'hi' ? 'hi-IN' : 'en-IN';
  };

  I18n.formatDate = function (iso, opts) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString(I18n.locale(),
        opts || { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return ''; }
  };

  /**
   * Apply translations to any static markup carrying data-i18n attributes.
   *   data-i18n            -> textContent
   *   data-i18n-html       -> innerHTML (for strings with markup)
   *   data-i18n-placeholder/title/aria-label -> the matching attribute
   */
  I18n.applyStatic = function (root) {
    var scope = root || document;

    scope.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = I18n.t(el.getAttribute('data-i18n'));
    });
    scope.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      el.innerHTML = I18n.t(el.getAttribute('data-i18n-html'));
    });
    ['placeholder', 'title', 'aria-label'].forEach(function (attr) {
      scope.querySelectorAll('[data-i18n-' + attr + ']').forEach(function (el) {
        el.setAttribute(attr, I18n.t(el.getAttribute('data-i18n-' + attr)));
      });
    });
  };

  I18n.load();
  global.I18n = I18n;
  // Short alias — these strings are referenced heavily across render functions.
  global.t = I18n.t;
})(window);
