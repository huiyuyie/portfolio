import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');

renderProjects(projects, projectsContainer, 'h2');

const projectsTitle = document.querySelector('.projects-title');
projectsTitle.textContent = `${projects.length} Projects`;


// Lab 05

let query = '';
let selectedIndex = -1;

let searchInput = document.querySelector('.searchBar');

function renderPieChart(projectsGiven) {
  let rolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year
  );

  let data = rolledData.map(([year, count]) => {
    return {
      value: count,
      label: year
    };
  });

  let arcGenerator = d3.arc()
    .innerRadius(0)
    .outerRadius(50);

  let sliceGenerator = d3.pie().value((d) => d.value);

  let arcData = sliceGenerator(data);
  let arcs = arcData.map((d) => arcGenerator(d));

  let colors = d3.scaleOrdinal(d3.schemeTableau10);

  let svg = d3.select('#projects-pie-plot');
  svg.selectAll('path').remove();

    arcs.forEach((arc, idx) => {
        svg
            .append('path')
            .attr('d', arc)
            .attr('fill', colors(idx))
            .attr('class', idx === selectedIndex ? 'selected' : '')
            .on('click', () => {
                selectedIndex = selectedIndex === idx ? -1 : idx;

                svg
                    .selectAll('path')
                    .attr('class', (_, i) => i === selectedIndex ? 'selected' : '');

                legend
                    .selectAll('li')
                    .attr('class', (_, i) => i === selectedIndex ? 'selected' : '');

                if (selectedIndex === -1) {
                    renderProjects(projectsGiven, projectsContainer, 'h2');
                } else {
                    let selectedYear = data[selectedIndex].label;

                    let filteredProjects = projectsGiven.filter((project) =>
                    project.year == selectedYear
                    );

                    renderProjects(filteredProjects, projectsContainer, 'h2');
                }
        });
    });

  let legend = d3.select('.legend');
  legend.selectAll('li').remove();

    data.forEach((d, idx) => {
        legend
            .append('li')
            .attr('style', `--color:${colors(idx)}`)
            .attr('class', idx === selectedIndex ? 'selected' : '')
            .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
    });
}

renderPieChart(projects);

searchInput.addEventListener('input', (event) => {
  query = event.target.value;

  let filteredProjects = projects.filter((project) => {
    let values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query.toLowerCase());
  });

  renderProjects(filteredProjects, projectsContainer, 'h2');
  renderPieChart(filteredProjects);
});




// // Step 4.1 (4.2 and 4.3)
// let query = '';
// let searchInput = document.querySelector('.searchBar');
// searchInput.addEventListener('input', (event) => {
//   // update query value
//   query = event.target.value;
//   // filter projects
//   let filteredProjects = projects.filter((project) => {
//     let values = Object.values(project).join('\n').toLowerCase();
//     return values.includes(query.toLowerCase());
//   });
//   // render filtered projects
//   renderProjects(filteredProjects, projectsContainer, 'h2');
// });


// // Step 1.3
// // let arcGenerator = d3.arc()
// //   .innerRadius(0)
// //   .outerRadius(50);

// // let arc = arcGenerator({
// //   startAngle: 0,
// //   endAngle: 2 * Math.PI
// // });

// // d3.select('#projects-pie-plot')
// //   .append('path')
// //   .attr('d', arc)
// //   .attr('fill', 'red');


// // Step 1.4 (Step 2.1)
// // let data = [
// //   { value: 1, label: 'apples' },
// //   { value: 2, label: 'oranges' },
// //   { value: 3, label: 'mangos' },
// //   { value: 4, label: 'pears' },
// //   { value: 5, label: 'limes' },
// //   { value: 5, label: 'cherries' },
// // ];


// // Step 3
// let rolledData = d3.rollups(
//   projects,
//   (v) => v.length,
//   (d) => d.year
// );

// let data = rolledData.map(([year, count]) => {
//   return {
//     value: count,
//     label: year
//   };
// });

// let arcGenerator = d3.arc()
//   .innerRadius(0)
//   .outerRadius(50);

// let sliceGenerator = d3.pie().value((d) => d.value);

// let arcData = sliceGenerator(data);

// let arcs = arcData.map((d) => arcGenerator(d));

// let colors = d3.scaleOrdinal(d3.schemeTableau10);

// arcs.forEach((arc, idx) => {
//   d3.select('#projects-pie-plot')
//     .append('path')
//     .attr('d', arc)
//     .attr('fill', colors(idx));
// });


// // Step 2.2
// let legend = d3.select('.legend');
// data.forEach((d, idx) => {
//   legend
//     .append('li')
//     .attr('style', `--color:${colors(idx)}`) // set the style attribute while passing in parameters
//     .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`); // set the inner html of <li>
// });