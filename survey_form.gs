/**
 * 熊本大学非公式時間割アプリ アンケートの Google フォームを自動生成する（Google Apps Script）。
 * 質問の内容は survey_questions.md と同じ。
 *
 * 使い方
 *   1. https://script.google.com で「新しいプロジェクト」を作り、このファイルの中身を Code.gs に貼る
 *   2. 関数に createSurveyForm を選んで「実行」し、権限を承認する（初回のみ）
 *   3. 「実行ログ」に出る「回答用URL」を、アプリのフッターのリンク先に使う（Claude に URL を渡すと差し替える）
 *      編集用URLは、フォームの見た目や設定を直すときに使う
 *
 * 同じプロジェクトで2回実行しても、フォームは増やさない（保存済みのURLをログに出すだけ）。
 * 作り直したいときは resetSavedForm を実行してから、もう一度 createSurveyForm を実行する。
 */

const FORM_TITLE = '熊大非公式時間割アプリ アンケート';
const FORM_DESCRIPTION = 'アプリを使ってみた感想を教えてください（1分ほどで終わります）。';
const CONFIRMATION_MESSAGE = 'ご協力ありがとうございました。いただいた意見は、今後の改善の参考にします。';

// true にすると回答を集計できるスプレッドシートも作る（スプレッドシートへの権限の承認が追加で必要）
const CREATE_RESPONSE_SHEET = false;

const FORM_ID_PROPERTY = 'SURVEY_FORM_ID';

// type: choice(ラジオボタン) / checkbox(複数選択) / list(プルダウン) / text(短い記述) / paragraph(段落)
const QUESTIONS = [
  {
    type: 'choice',
    title: 'Q1. 使っている端末は？',
    required: true,
    choices: ['スマホ', 'PC', '両方'],
  },
  {
    type: 'list',
    title: 'Q2-1. 学年（任意）',
    required: false,
    choices: ['1年', '2年', '3年', '4年', '5年', '6年', '大学院', 'その他'],
  },
  {
    type: 'text',
    title: 'Q2-2. 所属（学部・研究科）（任意）',
    required: false,
  },
  {
    type: 'checkbox',
    title: 'Q3. 使った機能は？（複数選択）',
    required: true,
    choices: [
      '講義の検索',
      '時間割づくり',
      '共有（URL）',
      '記録（出席・メモ）',
      'カレンダー(.ics)・Obsidian への出力',
      '壁紙保存',
      'バックアップ',
      'どれも使っていない',
    ],
  },
  {
    type: 'choice',
    title: 'Q4. このアプリが使えなくなったら、どう感じますか？',
    required: true,
    choices: ['とても残念', 'やや残念', '残念ではない', 'もう使っていない'],
  },
  {
    type: 'paragraph',
    title: 'Q5. 一番困ったこと、使いにくかったことは？（任意）',
    helpText: 'できるだけ具体的に教えてください（例:「スマホで○○のボタンが押しにくい」）。',
    required: false,
  },
  {
    type: 'paragraph',
    title: 'Q6. ほかに欲しい機能や、気づいたことは？（任意）',
    required: false,
  },
  {
    type: 'text',
    title: 'Q7. 詳しく聞いてもよい場合の連絡先（任意）',
    helpText: 'メールアドレスなど。書かなくても構いません。',
    required: false,
  },
];

/** フォームを作る。実行ログに回答用URLと編集用URLを出す。 */
function createSurveyForm() {
  const props = PropertiesService.getScriptProperties();
  const savedId = props.getProperty(FORM_ID_PROPERTY);
  if (savedId) {
    logFormUrls(FormApp.openById(savedId), '作成済みのフォームがあります（新しくは作りません）');
    return;
  }

  const form = FormApp.create(FORM_TITLE);
  form.setDescription(FORM_DESCRIPTION);
  form.setConfirmationMessage(CONFIRMATION_MESSAGE);
  form.setCollectEmail(false);            // 匿名で答えやすくする
  form.setLimitOneResponsePerUser(false); // ログインを求めない（離脱を減らす）
  form.setAllowResponseEdits(false);
  form.setProgressBar(false);
  form.setAcceptingResponses(true);

  QUESTIONS.forEach(function (q) {
    addQuestion(form, q);
  });

  if (CREATE_RESPONSE_SHEET) {
    const sheet = SpreadsheetApp.create(FORM_TITLE + '（回答）');
    form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());
    Logger.log('回答スプレッドシート: ' + sheet.getUrl());
  }

  props.setProperty(FORM_ID_PROPERTY, form.getId());
  logFormUrls(form, 'フォームを作成しました');
}

/** 保存済みのフォームの記録だけを消す（フォーム自体は削除しない）。作り直す前に実行する。 */
function resetSavedForm() {
  PropertiesService.getScriptProperties().deleteProperty(FORM_ID_PROPERTY);
  Logger.log('保存済みのフォームの記録を消しました。古いフォームは Google ドライブから手動で削除してください。');
}

function addQuestion(form, q) {
  let item;
  switch (q.type) {
    case 'choice':
      item = form.addMultipleChoiceItem().setChoiceValues(q.choices);
      break;
    case 'checkbox':
      item = form.addCheckboxItem().setChoiceValues(q.choices);
      break;
    case 'list':
      item = form.addListItem().setChoiceValues(q.choices);
      break;
    case 'text':
      item = form.addTextItem();
      break;
    case 'paragraph':
      item = form.addParagraphTextItem();
      break;
    default:
      throw new Error('未対応の質問の種類です: ' + q.type);
  }
  item.setTitle(q.title).setRequired(q.required);
  if (q.helpText) item.setHelpText(q.helpText);
}

function logFormUrls(form, message) {
  Logger.log(message);
  Logger.log('回答用URL（アプリに設定する）: ' + form.getPublishedUrl());
  Logger.log('編集用URL: ' + form.getEditUrl());
}
