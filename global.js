// Step 1
console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// Step 2.1
// const navLinks = $$("nav a");

// Step 2.2
// let currentLink = navLinks.find(
//     (a) => a.host === location.host && a.pathname === location.pathname
// );

// Step 2.3
// currentLink?.classList.add('current');


// Step 3.1
const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"
  : "/portfolio/";

let pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact' },
  { url: 'https://github.com/huiyuyie', title: 'Profile' },
  { url: 'resume/', title: 'Resume' },
  { url: 'meta/', title: 'Meta' }
];

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  let title = p.title;

  url = !url.startsWith('http') ? BASE_PATH + url : url;

  // nav.insertAdjacentHTML('beforeend', `<a href="${url}">${title}</a>`);

  // Step 3.2
  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;

  if (a.host === location.host && a.pathname === location.pathname) {
    a.classList.add('current');
  }

  if (a.host !== location.host) {
    a.target = "_blank";
  }

  nav.append(a);
}

// Step 4.2
document.body.insertAdjacentHTML(
  'afterbegin',
  `
	<label class="color-scheme">
		Theme:
		<select>
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
		</select>
	</label>`,
);


// Step 4.4
let select = document.querySelector('.color-scheme select');

select.addEventListener('input', function (event) {
  document.documentElement.style.setProperty('color-scheme', event.target.value);

  // Step 4.5
  localStorage.colorScheme = event.target.value;
});

if ('colorScheme' in localStorage) {
  let saved = localStorage.colorScheme;

  document.documentElement.style.setProperty('color-scheme', saved);

  select.value = saved;
}


// Step 5
let form = document.querySelector('form');

form?.addEventListener('submit', function (event) {
  event.preventDefault();

  let data = new FormData(form);
  let url = form.action + '?';

  for (let [name, value] of data) {
    url += `${name}=${encodeURIComponent(value)}&`;
  }
  location.href = url;
});



// Lab04


// Step 1.2
export async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    console.log(response);

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}

// Step 1.4
export function renderProjects(projects, containerElement, headingLevel = 'h2') {

  containerElement.innerHTML = '';

  for (let project of projects) {

    const article = document.createElement('article');

    article.innerHTML = `
      <${headingLevel}>${project.title}</${headingLevel}>
      <img src="${project.image}" alt="${project.title}">
      <div>
        <p>${project.description}</p>
        <p class="project-year">c. ${project.year}</p>
      </div>
    `;

    containerElement.appendChild(article);
  }
}

// Step 3.2
export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}