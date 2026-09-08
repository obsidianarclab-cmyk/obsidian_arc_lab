function openAnimeWithKeyboard(event){if(event.key==='Enter'||event.key===' '){event.preventDefault();openAnimeProduct()}}
function requestAnimeWithKeyboard(event){if(event.key==='Enter'||event.key===' '){event.preventDefault();askAnimeWhatsapp()}}
function openAnimeProduct(){document.getElementById('animeModal').classList.add('is-open');document.body.style.overflow='hidden';document.querySelector('#animeModal .statue-modal__close').focus()}
function closeAnimeProduct(){document.getElementById('animeModal').classList.remove('is-open');document.body.style.overflow=''}
function closeAnimeOnBackdrop(event){if(event.target.id==='animeModal')closeAnimeProduct()}
function askAnimeWhatsapp(){const message='Hello Obsidian Arc Lab, I would like to enquire about a custom anime 3D printed display. I will share my preferred character, size and colour.';openWhatsAppChoice(message)}
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeAnimeProduct()});
