const TREND_COLOR = "#2563eb"; 
const TREND_FILL = "rgba(37,99,235,0.08)";
const TREND_DEFAULT_DAYS =30;
let trendChart = null;
let trendReady = false;

//"YYYY-MM-DD" User's local time, <input type ="date">.
const toDateInput = d => {
    const lcoal = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0,10);
};

//set the date, local time
const dayStart = s => new Date(s + "T00:00:00");
const dayEnd = s => new Date(s + "T23:59:59.999");
const fmtDay = ms => new Date(ms).toLocaleDateString([],{month: "short", day: "numeric"});
const fmtFull = ms => new Date(ms).toLocaleString([],{dateStyle: "medium",timetyle: "short"});

function setTrendMessage(html) {
    $("trend-msg").innerHTML = html;
}

//Hide chart when there is nothing to show

function showChartArea(show) {
    $("trend-card").classList.toggle("hidden", !show);
    $("trend-export").disabled = !show;

}

/*--------- calling trend in app.js ---------*/
async function renderTrends() {
    if (typeof Chart === "undefined")
    {
        setTrendMessage(`<div class="msg err">The chart library did not load. Check your internet connection and reload the page.</div>`);
        showChartArea(false);
        return;
    }
    if(!trendReady)
    {
        const today = new Date(), from = new Date();
        from.setDate(today.getDate() - TREND_DEFAULT_DAYS);
        $("trend-start").value = toDateInput(from);
        $("trend-end").value = toDateInput(today);
        $("trend-end").max = toDateInput(today);
        trendReady = true;
    }

    try
    {
        const latest = await api("/measurements/latest");
        const current = $("trend-metric").value;
        if(!latest.length)
        {
            $("trend-metric").innerHTML = "";
            showChartArea(false);
            setTrendMessage(`<div class="empty">No measurements yet. Add one or sync a device to see your trends.</div>`);
            return;
        }
        $("trend-metric").innerHTML = latest.map(m => `<option value="${esc(m.metric)}">${esc(label(m.metric))}</option>`).join("");
        const keep = latest.some(m => m.metric === current) ? current
                    :latest.some(m => m.metric === "weight") ? "weight" : latest[0].metric;
        $("trend-metric").value = keep;

    }
    catch(err)
    {
        showErr($("trend-msg"), err);
        showChartArea(false);
        return;
    }
    drawTrend();
} 

/* ------------- REP-1: fetch, filter, draw -----------*/
async function drawTrend() {
    const metric = $("trend-metric").value, start = $("trend-start").value, end = $("trend-end").value;
    if(!metric) return;
    if(!start || !end)
    {
        showChartArea(false);
        setTrendMessage(`<div class="msg err">Choose both a start date and an end date.</div>`);
        return;
    }
    if(start> end)
    {
        showChartArea(false);
        setTrendMessage(`<div class="msg err">The start date must be on or before the end date.</div>`);
        return;
    }

    setTrendMessage(`<p class="hint">Loading…</p>`);
    let rows;
    try {
        rows = await api(`/measurements?metric=${encodeURIComponent(metric)}&limit=5000`);
    } catch (err) {
        showChartArea(false);
        showErr($("trend-msg"), err);
        return;
    }
     // Filter by date range (local days, end date inclusive), DESC.
    const from = dayStart(start).getTime(), to = dayEnd(end).getTime();
    let points = rows
    .filter(r => r.metric === metric)
    .map(r => ({x: asDate(r.timestamp).getTime(), y: r.value, unit: r.unit}))
    .filter(p => p.x >= from && p.x <= to)
    .sort((a, b) => a.x - b.x);

    if (!points.length) {
        if (trendChart) { trendChart.destroy(); trendChart = null; }
            showChartArea(false);
        setTrendMessage(`<div class="empty">No ${esc(label(metric).toLowerCase())} readings between ${esc(fmtDay(from))} and ${esc(fmtDay(to))}. Try a wider date range.</div>`);
        return;
    }
    // A metric can be logged in different units (e.g. kg and lb). Plot the unit of the most
  // recent reading so the line never mixes scales, and say how many were left out.
  const unit = points[points.length - 1].unit;
  const hidden = points.filter(p => p.unit !== unit).length;
  points = points.filter(p => p.unit === unit);

  const title = `${label(metric)} (${unit})`;
  $("trend-title").textContent = title;
  $("trend-range").textContent = `${fmtDay(from)} – ${fmtDay(to)} · ${points.length} reading${points.length === 1 ? "" : "s"}`;
  showChartArea(true);
  setTrendMessage(hidden
    ? `<div class="msg warn">${hidden} reading${hidden === 1 ? "" : "s"} in other units ${hidden === 1 ? "is" : "are"} not shown.</div>`
    : "");

  const values = points.map(p => p.y);
  const min = Math.min(...values), max = Math.max(...values), lastVal = values[values.length - 1];
  $("trend-canvas").setAttribute("aria-label",
    `Line chart of ${title} from ${fmtDay(from)} to ${fmtDay(to)}: ${points.length} readings, ` +
    `lowest ${min}, highest ${max}, most recent ${lastVal}.`);

  if (trendChart) trendChart.destroy();
  trendChart = new Chart($("trend-canvas"), {
    type: "line",
    data: {
      datasets: [{
        label: title,
        data: points.map(({x, y}) => ({x, y})),
        borderColor: TREND_COLOR,
        backgroundColor: TREND_FILL,
        fill: true,
        tension: 0.3,
        pointRadius: points.length > 60 ? 0 : 3,
        pointHoverRadius: 5,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {duration: 400},
      interaction: {mode: "nearest", intersect: false},
      plugins: {
        legend: {display: false},
        tooltip: {
          callbacks: {
            title: items => fmtFull(items[0].parsed.x),
            label: item => ` ${item.parsed.y} ${unit}`
          }
        }
      },
      scales: {
        // Linear time axis (milliseconds) keeps real spacing between readings
        // without needing a Chart.js date adapter.
        x: {
          type: "linear",
          min: from,
          max: to,
          ticks: {maxTicksLimit: 7, callback: v => fmtDay(v)},
          grid: {display: false}
        },
        y: {
          title: {display: true, text: unit},
          grace: "10%",
          grid: {color: "rgba(15,23,42,0.06)"}
        }
      }
    }
  });
}

/* ---------- SHARE-1: export the chart card as a PNG ---------- */
async function exportTrend() {
  if (!trendChart) return;
  if (typeof html2canvas === "undefined") {
    setTrendMessage(`<div class="msg err">The export library did not load. Check your internet connection and reload the page.</div>`);
    return;
  }
  const btn = $("trend-export");
  btn.disabled = true;
  btn.textContent = "Exporting…";
  try {
    // Jump to the final frame so the screenshot never catches the line mid-animation.
    trendChart.stop();
    trendChart.update("none");
    const shot = await html2canvas($("trend-card"), {
      backgroundColor: "#ffffff",
      scale: Math.max(2, window.devicePixelRatio || 1),   // crisp on high-DPI screens
      ignoreElements: el => el.id === "trend-export"        // keep the button out of the image
    });
    const a = document.createElement("a");
    a.href = shot.toDataURL("image/png");
    a.download = `healthtrack-trends-${$("trend-metric").value}-${toDateInput(new Date())}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast("Chart image downloaded.");
  } catch (err) {
    setTrendMessage(`<div class="msg err">Could not export the chart: ${esc(err.message || err)}</div>`);
  } finally {
    btn.disabled = false;
    btn.textContent = "Export as Image";
  }
}

/* ---------- wire up controls ---------- */
["trend-metric", "trend-start", "trend-end"].forEach(id => $(id).addEventListener("change", drawTrend));
$("trend-export").addEventListener("click", exportTrend);
  
