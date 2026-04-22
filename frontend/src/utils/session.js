// Generate and store session ID
// This identifies the user without login

export function getSessionId() {
  let id = localStorage.getItem('equiai_session');
  if (!id) {
    id = 'sess_' + Math.random().toString(36).substr(2, 16);
    localStorage.setItem('equiai_session', id);
  }
  return id;
}

export function getPlan() {
  return localStorage.getItem('equiai_plan') || 'free';
}

export function setPlan(plan) {
  localStorage.setItem('equiai_plan', plan);
}
