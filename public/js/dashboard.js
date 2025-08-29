$(function () {
  fetchAndDisplayCounts();

  // ========== DASHBOARD COUNTS ==========
  function showSkeletons() {
    const cards = [
      { h2: "#ttl_org", h4: "#ttl_org_label", line: "#ttl_org_line" },
      { h2: "#ttl_stu", h4: "#ttl_stu_label", line: "#ttl_stu_line" },
      { h2: "#actve_stu", h4: "#actve_stu_label", line: "#actve_stu_line" },
      { h2: "#active_org", h4: "#active_org_label", line: "#active_org_line" },
    ];

    cards.forEach((c) => {
      $(c.h2).html('<span class="skeleton skeleton-number"></span>');
      $(c.h4).html('<span class="skeleton skeleton-line wide"></span>');
      $(c.line).html('<span class="skeleton skeleton-line full"></span>');
    });
  }

  function buildTrendLine(percent, id) {
    let iconClass, trendClass;

    if (percent > 0) {
      iconClass = "fa-arrow-up up-progress";
      trendClass = "up";
    } else if (percent < 0) {
      iconClass = "fa-arrow-down down-progress";
      trendClass = "down";
    } else {
      iconClass = "fa-minus neutral-progress";
      trendClass = "neutral";
    }

    return `
      <p class="change ${trendClass}">
        <i class="fa-solid ${iconClass}"></i>
        <span id="${id}">${Math.abs(percent)}</span>% (30 days)
      </p>
    `;
  }

  function fetchAndDisplayCounts() {
    showSkeletons();
    showProgressLoader(".progress-bar");

    $.ajax({
      url: "/admin/get-counts",
      method: "POST",
      dataType: "json",
      success: function (data) {
        $("#ttl_org").text(data.totalOrgs);
        $("#ttl_org_label").text("Organizations");
        $("#ttl_org_line").html(
          buildTrendLine(data.orgIncPercent, "ttl_org_inc")
        );

        $("#ttl_stu").text(data.totalStudents);
        $("#ttl_stu_label").text("Total Students");
        $("#ttl_stu_line").html(
          buildTrendLine(data.stuIncPercent, "ttl_stu_inc")
        );

        $("#actve_stu").text(data.totalActiveStudents);
        $("#actve_stu_label").text("Active Students");
        $("#actve_stu_line").html(
          buildTrendLine(data.activeStuIncPercent, "actve_stu_inc")
        );

        $("#active_org").text(data.totalActiveOrgs);
        $("#active_org_label").text("Active Organisations");
        $("#active_org_line").html(
          buildTrendLine(data.activeOrgIncPercent, "active_org_inc")
        );

        animateCircularProgress(
          ".progress-bar",
          data.totalActiveOrgs,
          data.totalOrgs,
          1200
        );
      },
      error: function (err) {
        console.error("Error fetching counts:", err);
      },
    });
  }

  function animateCircularProgress(selector, value, total, duration = 1000) {
    const percent = total > 0 ? Math.round((value / total) * 100) : 0;
    const bar = document.querySelector(selector);
    if (!bar) return;

    const startTime = performance.now();

    function animate(time) {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.round(progress * percent);

      const color =
        percent >= 70 ? "#4CAF50" : percent >= 40 ? "#FFC107" : "#F44336";

      bar.style.background = `
        radial-gradient(closest-side, #6976EB 79%, transparent 80% 100%),
        conic-gradient(${color} ${current}%, #e0e0e0 0)
      `;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }

  function showProgressLoader(selector) {
    const bar = document.querySelector(selector);
    if (bar) bar.classList.add("skeleton");
  }

  // ========== COMMON DATA ==========
  const subjects = ["Science", "Maths", "English", "Tamil", "Computer"];
  const subjectColors = [
    ["#D03603", "#f0c7b0"],
    ["#2C96D3", "#b0d4f0"],
    ["#F7C604", "#f8efb0"],
    ["#FF6B6B", "#FFD1D1"],
    ["#4CAF50", "#B9F6CA"],
  ];

  // ========== HELPER: RENDER WITH LOADER ==========
  function renderWithFullLoader(containerEl, renderFn) {
    if (!containerEl) return;

    let loader = containerEl.querySelector(".chart-loader");
    if (!loader) {
      loader = document.createElement("div");
      loader.className = "chart-loader";
      loader.style.position = "absolute";
      loader.style.top = "50%";
      loader.style.left = "50%";
      loader.style.transform = "translate(-50%, -50%)";
      loader.style.zIndex = "10";
      containerEl.appendChild(loader);
    }

    Array.from(containerEl.children).forEach((child) => {
      if (child !== loader) {
        child.style.visibility = "hidden";
      }
    });

    setTimeout(() => {
      renderFn();
      if (loader) loader.remove();
      Array.from(containerEl.children).forEach((child) => {
        child.style.visibility = "visible";
      });
    }, 500);
  }

  fetchDataforChart();
  function fetchDataforChart() {
    $.ajax({
      url: "/admin/get-chart-data",
      method: "POST",
      dataType: "json",
      success: function (data) {
        if (data.status == 200) {
          renderWithFullLoader(
            document.getElementById("barChart").parentElement,
            () =>
              renderBarChart(
                data.subjects,
                data.totalStudents,
                data.activeStudents
              )
          );
          //   initCharts();
          // initiateSingleDonutChart();
        } else {
          console.error("Error fetching chart data:", data.error);
        }
      },
      error: function (err) {
        console.error("Error fetching chart data:", err);
      },
    });
  }

  // ========== BAR CHART ==========
  let barChartInstance = null;
  function renderBarChart(subjectData, totalStudents, activeStudents) {
    // console.log(subjectData, totalStudents, activeStudents);
    // return;
    const containerEl = document.querySelector(".bar-chart-container");
    const loader = containerEl.querySelector(".chart-loader");
    if (loader) loader.style.display = "block";
    containerEl.style.visibility = "hidden";

    const ctx = document.getElementById("barChart").getContext("2d");

    // Destroy previous chart if exists
    if (barChartInstance) {
      barChartInstance.destroy();
    }

    barChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: subjectData,
        datasets: [
          {
            label: "Total Students",
            data: totalStudents,
            backgroundColor: "rgba(255, 159, 64, 0.6)",
          },
          {
            label: "Active Students",
            data: activeStudents,
            backgroundColor: "rgba(153, 102, 255, 0.6)",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1500 },
        plugins: {
          legend: {
            position: "top",
            labels: {
              font: { size: 16, family: "'Barlow', sans-serif", weight: "600" },
              color: "#2d2d3a",
            },
          },
          tooltip: { enabled: true },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: totalStudents
              .map((n) => n + 10)
              .reduce((a, b) => Math.max(a, b), 0),
            ticks: { color: "#555" },
            grid: { color: "#ddd" },
          },
          x: {
            ticks: {
              color: "#555",
              font: { size: 14, family: "'Barlow', sans-serif", weight: "600" },
              maxRotation: 0,
              minRotation: 0,
            },
            grid: { display: false },
          },
        },
      },
    });
  }

  //   // ========== INIT WITH LOADERS ==========
  //   // Bar chart
  //   renderWithFullLoader(
  //     document.getElementById("barChart").parentElement,
  //     renderBarChart
  //   );

  // ========== MULTIPLE DONUTS ==========
  fetchDataforMultipleDonutCharts();
  function fetchDataforMultipleDonutCharts() {
    $.ajax({
      url: "/admin/get-charts-data",
      method: "POST",
      dataType: "json",
      success: function (data) {
        console.log(data);
        if (data.status == 200) {
          // First render the DOM for multiple donut charts
          renderMultipleDonutChartBase(data.subjects);

          // Then initialize charts with the subjects
          initCharts(data.subjects, data.performancePercents);
        } else {
          console.error("Error fetching chart data:", data.error);
        }
      },
      error: function (err) {
        console.error("Error fetching chart data:", err);
      },
    });
  }

  function renderMultipleDonutChartBase(subjectData) {
    let html = ``;
    subjectData.forEach((subject) => {
      html += `
      <div class="chart-wrapper">
        <canvas id="${subject.toLowerCase()}Chart" width="200" height="200"></canvas>
        <p>${subject}</p>
      </div>
    `;
    });
    $(".charts-row").html(html);
  }

  function initCharts(subjectData, performancePercents) {
    subjectData.forEach((subject, index) => {
      //   console.log(subject, performancePercents[index], subjectColors[index]);
      // Select the canvas element
      const canvasEl = document.getElementById(subject.toLowerCase() + "Chart");
      if (!canvasEl) return;

      const wrapperEl = canvasEl.closest(".chart-wrapper");

      renderWithFullLoader(wrapperEl, () => {
        const ctx = canvasEl.getContext("2d");
        createDonutChart(ctx, performancePercents[index], subjectColors[index]);
      });
    });
  }

  function createDonutChart(ctx, percent, colors) {
    console.log(ctx, percent, colors);
    return new Chart(ctx, {
      type: "doughnut",
      data: {
        datasets: [
          {
            data: [percent, 100 - percent],
            backgroundColor: colors,
            borderWidth: 0,
            cutout: "50%",
          },
        ],
      },
      options: {
        responsive: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
      },
      plugins: [
        {
          id: "centerText",
          afterDraw(chart) {
            const {
              ctx,
              chartArea: { left, width, top, height },
            } = chart;
            ctx.save();
            ctx.font = "700 18px Barlow, sans-serif";
            ctx.fillStyle = "#000";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(`${percent}%`, left + width / 2, top + height / 2);
            ctx.restore();
          },
        },
      ],
    });
  }

  // ========== SINGLE DONUTS ==========
  getSingleDonutData();
  function getSingleDonutData() {
    $.ajax({
      url: "/admin/get-single-donut-charts-data",
      method: "POST",
      dataType: "json",
      success: function (data) {
        if (data.status == 200) {
          renderSingleDonutChartBase(data.data);
          initiateSingleDonutChart(
            data.subjects,
            data.activePercentData,
            data.orgCompletionPercentData
          );
        } else {
          console.error("Error fetching chart data:", data.error);
        }
      },
      error: function (err) {
        console.error("Error fetching chart data:", err);
      },
    });
  }

  function renderSingleDonutChartBase(data) {
    let html = ``;
    data.forEach((item) => {
      html += `
      <div class="dash-subject-card">
        <h3>${item.subject}</h3>
        <div class="dual-chart">
          <canvas id="${item.subject.toLowerCase()}Outer" width="150" height="150"></canvas>
          <canvas
            id="${item.subject.toLowerCase()}Inner"
            width="153"
            height="155"
            class="inner-ring"
          ></canvas>
        </div>
        <div class="dash-stats">
        <p>
            <strong>${item.ttlOrgCountBySubject}</strong><br />
            <span class="dash-label">Total schools</span>
          </p>
          <hr/>
          <p>
            <strong>${item.orgActivePercent}%</strong><br />
            <span class="dash-label">Active schools</span>
          </p>
          <hr class="green-line" />
          <p>
            <strong>${item.orgCompletionPercent}%</strong><br />
            <span class="dash-label">Percentage Performance</span>
          </p>
          <hr class="peach-line" />
        </div>
      </div>
    `;
    });
    $(".participation-cards").html(html);
  }

  function initiateSingleDonutChart(
    subjects,
    activePercents,
    orgCompletionPercents
  ) {
    const outerPercents = activePercents;
    const innerPercents = orgCompletionPercents;
    // Single donuts
    subjects.forEach((subject, index) => {
      const outerEl = document
        .getElementById(subject.toLowerCase() + "Outer")
        .closest(".dash-subject-card");

      renderWithFullLoader(outerEl, () => {
        createSingleDonut(
          subject.toLowerCase() + "Outer",
          outerPercents[index],
          "#00a88f"
        );
        createSingleDonut(
          subject.toLowerCase() + "Inner",
          innerPercents[index],
          "#f3b9a4",
          "85%"
        );
      });
    });
  }

  function createSingleDonut(id, percent, color, cutout = "60%") {
    const ctx = document.getElementById(id).getContext("2d");
    new Chart(ctx, {
      type: "doughnut",
      data: {
        datasets: [
          {
            data: [percent, 100 - percent],
            backgroundColor: [color, "#eee"],
            borderWidth: 0,
            cutout,
          },
        ],
      },
      options: {
        responsive: false,
        plugins: { tooltip: { enabled: false }, legend: { display: false } },
      },
    });
  }
});
