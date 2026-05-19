import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));

  return data;
}

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;

      let ret = {
        id: commit,
        url: 'https://github.com/huiyuyie/portfolio/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,
        enumerable: false,
      });

      return ret;
    })
    .sort((a, b) => d3.ascending(a.datetime, b.datetime));
}

function renderCommitInfo(data, commits) {
  d3.select('#stats').html('');

  const dl = d3
    .select('#stats')
    .append('dl')
    .attr('class', 'stats');

  const numFiles = d3.group(data, (d) => d.file).size;
  const maxDepth = d3.max(data, (d) => d.depth);
  const longestLine = d3.max(data, (d) => d.length);
  const maxLines = d3.max(
    d3.rollups(
        data,
        v => d3.max(v, d => d.line),
        d => d.file
    ), d => d[1]);

  dl.append('dt').text('Commits');
  dl.append('dd').text(commits.length);

  dl.append('dt').text('Files');
  dl.append('dd').text(numFiles);

  dl.append('dt').html('Total <abbr title="Lines of Code">LOC</abbr>');
  dl.append('dd').text(data.length);

  dl.append('dt').text('Max depth');
  dl.append('dd').text(maxDepth);

  dl.append('dt').text('Longest line');
  dl.append('dd').text(longestLine);

  dl.append('dt').text('Max lines');
  dl.append('dd').text(maxLines);
}

let xScale;
let yScale;

let data = await loadData();
let commits = processCommits(data);

let commitProgress = 100;

let timeScale = d3
  .scaleTime()
  .domain([
    d3.min(commits, (d) => d.datetime),
    d3.max(commits, (d) => d.datetime),
  ])
  .range([0, 100]);

let commitMaxTime = timeScale.invert(commitProgress);

let filteredCommits = commits;

let colors = d3.scaleOrdinal(d3.schemeTableau10);

function onTimeSliderChange() {
  commitProgress = Number(document.getElementById('commit-progress').value);
  commitMaxTime = timeScale.invert(commitProgress);

  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
  let filteredData = filteredCommits.flatMap((d) => d.lines);

  document.getElementById('commit-max-time').textContent =
    commitMaxTime.toLocaleString('en', {
      dateStyle: 'long',
      timeStyle: 'short',
    });
  
  updateFileDisplay(filteredCommits);
  renderCommitInfo(filteredData, filteredCommits);
  updateScatterPlot(data, filteredCommits);
}

document
  .getElementById('commit-progress')
  .addEventListener('input', onTimeSliderChange);


function updateFileDisplay(commits) {
  let lines = commits.flatMap((d) => d.lines);

  let files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => {
      return { name, lines };
    })
    .sort((a, b) => b.lines.length - a.lines.length);

  let filesContainer = d3
    .select('#files')
    .selectAll('div')
    .data(files, (d) => d.name)
    .join(
      (enter) =>
        enter.append('div').call((div) => {
          div.append('dt').append('code');
          div.append('dd');
        }),
    );

    filesContainer
      .select('dt > code')
      .html((d) => `${d.name}<small>${d.lines.length} lines</small>`);

    filesContainer
      .select('dd')
      .selectAll('div')
      .data((d) => d.lines)
      .join('div')
      .attr('class', 'loc')
      .attr('style', (d) => `--color: ${colors(d.type)}`);
}


function renderTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  if (Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id;

  date.textContent = commit.datetime?.toLocaleString('en', {
    dateStyle: 'full',
  });

  time.textContent = commit.datetime?.toLocaleString('en', {
    timeStyle: 'short',
  });

  author.textContent = commit.author;
  lines.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');

  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');

  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

function createBrushSelector(svg, usableArea) {
  const brush = d3
    .brush()
    .extent([
      [usableArea.left, usableArea.top],
      [usableArea.right, usableArea.bottom],
    ])
    .on('start brush end', brushed);

  svg
    .append('g')
    .attr('class', 'brush')
    .call(brush);

  svg.selectAll('.dots').raise();
}

function brushed(event) {
  const selection = event.selection;

  d3.selectAll('circle').classed('selected', (d) =>
    isCommitSelected(selection, d)
  );

  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);
}

function renderSelectionCount(selection) {
  const selectedCommits = selection
    ? filteredCommits.filter((d) => isCommitSelected(selection, d))
    : [];

  const countElement = document.querySelector('#selection-count');

  countElement.textContent = `${
    selectedCommits.length || 'No'
  } commits selected`;

  return selectedCommits;
}

function renderLanguageBreakdown(selection) {
  const selectedCommits = selection
    ? filteredCommits.filter((d) => isCommitSelected(selection, d))
    : [];

  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }

  const requiredCommits = selectedCommits.length
    ? selectedCommits
    : filteredCommits;

  const lines = requiredCommits.flatMap((d) => d.lines);

  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type,
  );

  container.innerHTML = '';

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;

    const formatted = d3.format('.1~%')(proportion);

    container.innerHTML += `
      <div>
        <dt>${language}</dt>
        <dd>${count} lines (${formatted})</dd>
      </div>
    `;
  }
}

function isCommitSelected(selection, commit) {
  if (!selection) {
    return false;
  }

  const [[x0, y0], [x1, y1]] = selection;

  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);

  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}



function renderScatterPlot(data, commits) {

  const width = 1000;
  const height = 600;

  const margin = {top: 30, right: 40, bottom: 50, left: 50};

  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
 };

  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  const padding = 25;

  xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([usableArea.left + padding, usableArea.right - padding])
    .nice();

  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom - padding, usableArea.top + padding]);

  const [minLines, maxLines] = d3.extent(
    commits,
    (d) => d.totalLines
  );

  const rScale = d3
    .scaleSqrt()
    .domain([minLines, maxLines])
    .range([2, 30]);

  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale).tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');


  const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);

  gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

  svg
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${usableArea.bottom - padding})`)
    .call(xAxis);

  svg
    .append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${usableArea.left + padding}, 0)`)
    .call(yAxis);

  const dots = svg
    .append('g')
    .attr('class', 'dots');

  const sortedCommits = d3.sort(
    commits,
    (d) => -d.totalLines
  );

  dots
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id)
    .join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .style('--r', d => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
        d3.select(event.currentTarget).style('fill-opacity', 1);
        renderTooltipContent(commit);
        updateTooltipVisibility(true);
        updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
        d3.select(event.currentTarget).style('fill-opacity', 0.7);
        updateTooltipVisibility(false);
    });

    createBrushSelector(svg, usableArea);

}

function updateScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;

  const margin = { top: 30, right: 40, bottom: 50, left: 50 };

  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const padding = 25;

  const svg = d3.select('#chart').select('svg');

  xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([usableArea.left + padding, usableArea.right - padding])
    .nice();

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);

  const rScale = d3
    .scaleSqrt()
    .domain([minLines, maxLines])
    .range([2, 30]);

  const xAxis = d3.axisBottom(xScale);

  svg.select('g.x-axis').call(xAxis);

  const dots = svg.select('g.dots');

  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  dots
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .style('--r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });

  svg.selectAll('.dots').raise();
}

renderScatterPlot(data, commits);
onTimeSliderChange();

d3.select('#scatter-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html(
    (d, i) => `
      On ${d.datetime.toLocaleString('en', {
        dateStyle: 'full',
        timeStyle: 'short',
      })},
      I made <a href="${d.url}" target="_blank">${
        i > 0 ? 'another commit' : 'my first commit'
      }</a>.
      I edited ${d.totalLines} lines across ${
        d3.rollups(
          d.lines,
          (D) => D.length,
          (d) => d.file,
        ).length
      } files.
    `,
  );



function onStepEnter(response) {
  const commit = response.element.__data__;
  commitMaxTime = commit.datetime;

  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
  const filteredData = filteredCommits.flatMap((d) => d.lines);

  document.getElementById('commit-max-time').textContent =
    commitMaxTime.toLocaleString('en', {
      dateStyle: 'long',
      timeStyle: 'short',
    });

  document.getElementById('commit-progress').value = timeScale(commitMaxTime);

  updateFileDisplay(filteredCommits);
  renderCommitInfo(filteredData, filteredCommits);
  updateScatterPlot(data, filteredCommits);
}

const scroller = scrollama();

scroller
  .setup({
    container: '#scrolly-1',
    step: '#scrolly-1 .step',
  })
  .onStepEnter(onStepEnter);