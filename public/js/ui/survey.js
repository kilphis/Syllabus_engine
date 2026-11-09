import { openModal, closeModal } from './modals.js';
import { SURVEY_URL } from '../constants.js';
import { registerVisit, isDue, markShown, markDone, dismiss, SHOW_DELAY_MS } from '../survey.js';

const MODAL_ID = 'surveyModal';

export const isSurveyOpen = () => !document.getElementById(MODAL_ID).classList.contains('hidden');

const otherModalOpen = () =>
    [...document.querySelectorAll('[id$="Modal"]')].some(m => m.id !== MODAL_ID && !m.classList.contains('hidden'));

function showIfDue() {
    // 別のウィンドウを開いている最中は邪魔しない（その回は見送る）
    if (!SURVEY_URL || !isDue() || otherModalOpen()) return;
    markShown();
    openModal(MODAL_ID);
}

export function initSurvey() {
    registerVisit();
    setTimeout(showIfDue, SHOW_DELAY_MS);
}

// 回答ページを新しいタブで開く。以後は出さない
export function openSurvey() {
    window.open(SURVEY_URL, '_blank', 'noopener');
    markDone();
    closeModal(MODAL_ID);
}

export function answeredSurvey() {
    markDone();
    closeModal(MODAL_ID);
}

export function closeSurvey() {
    dismiss();
    closeModal(MODAL_ID);
}
