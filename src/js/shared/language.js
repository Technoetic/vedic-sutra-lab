const preferenceKey='sutra-lab-language';
export function readLanguage(){try{return localStorage.getItem(preferenceKey)==='en'?'en':'ko';}catch{return 'ko';}}
export function writeLanguage(locale){try{localStorage.setItem(preferenceKey,locale);}catch{}}

export function updateShell(locale){
  const english=locale==='en';
  document.documentElement.lang=locale;
  const picker=document.querySelector('#language');picker.value=locale;picker.setAttribute('aria-label',english?'Language':'언어 설정');
  document.querySelector('.skip-link').textContent=english?'Skip to content':'본문으로 바로 가기';
  document.querySelector('.header-nav').setAttribute('aria-label',english?'Main navigation':'주 메뉴');
  document.querySelector('.app-header .brand').setAttribute('aria-label',english?'SUTRA LAB home':'SUTRA LAB 홈');
  document.querySelector('[data-copy="explore"]').textContent=english?'Explore':'규칙 탐색';
  document.querySelector('[data-copy="about"]').textContent=english?'About the lab':'이 실험실에 대하여';
  document.querySelector('.footer p').textContent=english?'Same numbers. Different ways to think.':'숫자는 같아도, 생각하는 길은 다르니까.';
  document.querySelector('meta[name="description"]').content=english?'Change the numbers and discover patterns. Explore 16 rules of Vedic mathematics at your own pace.':'숫자를 바꾸고, 패턴을 발견하세요. 16가지 베다 수학 규칙을 내 속도로 탐색하는 작은 수학 실험실.';
}
