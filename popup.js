let today = new Date();
let currentMonth = today.getMonth();
let currentYear = today.getFullYear();
let selectYear = document.getElementById("year");
let selectMonth = document.getElementById("month");
let usernameInput = document.getElementById("usernameInput");
let submitUsernameButton = document.getElementById("submitUsername");
let usernameGet = document.getElementById("usernameGet");
let username = '';

getUsernameOnStorage();

let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
let monthAndYear = document.getElementById("monthAndYear");
showCalendar(currentMonth, currentYear);


submitUsernameButton.addEventListener("click", submitUsername);
usernameGet.addEventListener("click", changeUsername);

document.getElementById("previous").addEventListener("click", previous);
document.getElementById("next").addEventListener("click", next);

document.getElementById("month").addEventListener("click", jump);
document.getElementById("year").addEventListener("click", jump);

function getUsernameOnStorage() {
  chrome.storage.local.get(["username"], function (data) {
    usernameGet.innerHTML = data.username;
    username = data.username;
    displayOrHideInputUsername();
  });
}

function displayOrHideInputUsername() {
  if (!username || username === '') {
    changeUsername()
  } else {
    usernameInput.style.display = 'none';
    submitUsernameButton.style.display = 'none';
    usernameGet.style.display = 'inline-block';
    showCalendar(currentMonth, currentYear);
  }
}

function submitUsername() {
  chrome.storage.local.set({ "username": usernameInput.value }, () => {
    getUsernameOnStorage();
    showCalendar();
  });
}

function changeUsername() {
  usernameInput.style.display = 'inline-block';
  submitUsernameButton.style.display = 'inline-block';
  usernameGet.style.display = 'none';
}

function next() {
  currentYear = (currentMonth === 11) ? currentYear + 1 : currentYear;
  currentMonth = (currentMonth + 1) % 12;
  showCalendar(currentMonth, currentYear);
}

function previous() {
  currentYear = (currentMonth === 0) ? currentYear - 1 : currentYear;
  currentMonth = (currentMonth === 0) ? 11 : currentMonth - 1;
  showCalendar(currentMonth, currentYear);
}

function jump() {
  currentYear = parseInt(selectYear.value);
  currentMonth = parseInt(selectMonth.value);
  showCalendar(currentMonth, currentYear);
}

async function showCalendar(month, year) {
  const mapData = await getWorklogData(month, year);
  if (month && year) {
    drawTable(month, year, mapData);
  }
}

async function getWorklogData(month, year) {
  const rawData = await getRawData(month, year);
  const mapData = putDataIntoMap(rawData);
  return mapData;

}

async function getRawData(month, year) {
  const startDate = createStartDate(month + 1, year);
  const endDate = createEndDate(month + 1, year);
  if (username && startDate && endDate) {
    const response = await fetch(
      'http://10.72.0.164:3000/service-report-json/?users=' + username +
      '&fromDate=' + startDate +
      '&toDate=' + endDate
    );
    const rawData = await response.json();
    return rawData && rawData.length > 0 ? rawData[0].worklogs : [];
  } else {
    return [];
  }
}

function putDataIntoMap(worklogs) {
  const map = new Map();
  worklogs.forEach(w => map.set(w.startdate, w.time));
  return map;
}

function createStartDate(month, year) {
  return year + '-' + month + '-01';
}

function createEndDate(month, year) {
  const day = getLastDayOfMonth(month, year);
  return year + '-' + month + '-' + day;
}

function getLastDayOfMonth(month, year) {
  const d = new Date(year, month, 0);
  return d.getDate();
}

function drawTable(month, year, mapData) {

  let firstDay = (new Date(year, month)).getDay();
  let daysInMonth = 32 - new Date(year, month, 32).getDate();

  let tbl = document.getElementById("calendar-body"); // body of the calendar

  // clearing all previous cells
  tbl.innerHTML = "";

  console.log('username: ' + username + ', month: ' + (month + 1) + ', year: ' + year);

  // filing data about month and in the page via DOM.
  monthAndYear.innerHTML = months[month] + " " + year;
  selectYear.value = year;
  selectMonth.value = month;

  // creating all cells
  let date = 1;
  for (let i = 0; i < 6; i++) {
    // creates a table row
    let row = document.createElement("tr");

    //creating individual cells, filing them up with data.
    for (let j = 0; j < 7; j++) {
      if (i === 0 && j < firstDay) {
        let cell = document.createElement("td");
        let cellText = document.createTextNode("");
        cell.appendChild(cellText);
        row.appendChild(cell);
      } else if (date > daysInMonth) {
        break;
      } else {
        let cell = document.createElement("td");
        let spanWorklog = createSpanWorklog(date, month, year, mapData);
        let spanDate = createSpanDate(date, month, year, mapData);

        if (date === today.getDate() && year === today.getFullYear() && month === today.getMonth()) {
          cell.classList.add("td-today"); // color today's date
        }

        cell.appendChild(spanDate);
        cell.appendChild(spanWorklog);
        row.appendChild(cell);
        date++;
      }
    }

    tbl.appendChild(row); // appending each row into calendar body.
  }
}

function createSpanDate(date, month, year, mapData) {
  let spanDate = document.createElement("span");
  const spanDateText = document.createTextNode(date);
  const workHour = getWorkLogHour(date, month, year, mapData);
  spanDate.classList.add(getSpanDateClass(date, month, year, workHour));
  spanDate.appendChild(spanDateText);
  return spanDate;
}

function getSpanDateClass(date, month, year, workHour) {
  let styleClass = 'span-date';
  const d = new Date(year, month, date);
  if (isWeekend(d)) {
    styleClass = 'span-date-weekend'
  } else if (!isFutureDate(d)) {
    if (workHour < 8) {
      styleClass = 'span-date-no-worklog';
    }
  }
  return styleClass;
}

function isFutureDate(d) {
  return new Date() <= d;
}

function isWeekend(d) {
  const day = d.getDay();
  return day === 6 || day === 0;
}

function createSpanWorklog(date, month, year, mapData) {
  let spanWorklog = document.createElement("span");
  const workHour = getWorkLogHour(date, month, year, mapData);
  const spanWorklogText = document.createTextNode(workHour === 0 ? '' : workHour);
  spanWorklog.classList.add('span-worklog');
  spanWorklog.appendChild(spanWorklogText);
  return spanWorklog;
}

function getWorkLogHour(date, month, year, mapData) {
  let monthConvert = (month + 1) < 10 ? '0' + (month + 1) : (month + 1);
  let dateConvert = date < 10 ? '0' + date : date;
  const workHour = mapData.get(year + '-' + monthConvert + '-' + dateConvert);
  return workHour ? workHour : 0;
}

usernameInput.addEventListener("keyup", function (event) {
  if (event.keyCode === 13) {
    event.preventDefault();
    submitUsername();
  }
});