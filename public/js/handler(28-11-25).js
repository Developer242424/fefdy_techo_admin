const slimSelectInstances = {};

function reinitSlimSelect(id) {
  if (slimSelectInstances[id]) {
    slimSelectInstances[id].destroy();
  }
  const select = new SlimSelect({
    select: `#${id}`,
  });
  slimSelectInstances[id] = select;
  return select;
}
function reinitSlimSelectByClass(element) {
  if (slimSelectInstances[element]) {
    slimSelectInstances[element].destroy();
  }
  const select = new SlimSelect({
    select: `.${element}`, // use class selector consistently
  });
  slimSelectInstances[element] = select;
  return select;
}

function getSubjectForDrop(id, selectedValue = null) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: "/admin/get-subjects-for-drop",
      method: "POST",
      success: function (res) {
        let html = `<option value="">Select Subject</option>`;
        if (res.status === 200) {
          res.data.forEach((value) => {
            html += `<option value="${value.id}">${value.subject}</option>`;
          });
        }
        $(`#${id}`).html(html);
        const select = reinitSlimSelect(id);

        if (selectedValue) {
          select.setSelected([String(selectedValue)], true);
        }

        if (res.status !== 200)
          ToastAlert("warning", res.message || "Something went wrong.");

        resolve(select);
      },
      error: function (xhr) {
        ToastAlert(
          "warning",
          xhr?.responseJSON?.message || "An error occurred."
        );
        reject("Error fetching subjects.");
      },
    });
  });
}

function getLevelForDrop(id, selectedValue = null) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: "/admin/get-levels-for-drop",
      method: "POST",
      success: function (res) {
        let html = `<option value="">Select Level</option>`;
        if (res.status === 200) {
          res.data.forEach((value) => {
            html += `<option value="${value.id}">${value.level}</option>`;
          });
        }
        $(`#${id}`).html(html);
        const select = reinitSlimSelect(id);

        if (selectedValue) {
          select.setSelected([String(selectedValue)], true);
        }

        if (res.status !== 200)
          ToastAlert("warning", res.message || "Something went wrong.");

        resolve(select);
      },
      error: function (xhr) {
        ToastAlert(
          "warning",
          xhr?.responseJSON?.message || "An error occurred."
        );
        reject("Error fetching subjects.");
      },
    });
  });
}

function getSubjectForDropByClass(element, selectedValue = null) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: "/admin/get-subjects-for-drop",
      method: "POST",
      success: function (res) {
        let html = `<option value="">Select Subject</option>`;
        if (res.status === 200 && Array.isArray(res.data)) {
          res.data.forEach((value) => {
            html += `<option value="${value.id}">${value.subject}</option>`;
          });
        }

        $(element).html(html);
        const select = new SlimSelect({ select: element });

        if (selectedValue) {
          select.setSelected([String(selectedValue)], true);
        }

        resolve(select);
      },
      error: function (xhr) {
        ToastAlert(
          "warning",
          xhr?.responseJSON?.message || "An error occurred."
        );
        reject("Error fetching standards.");
      },
    });
  });
}

function getLevelForDropByClass(element, selectedValues = []) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: "/admin/get-levels-for-drop",
      method: "POST",
      success: function (res) {
        let html = `<option value="">Select Level</option>`;
        if (res.status === 200 && Array.isArray(res.data)) {
          res.data.forEach((value) => {
            html += `<option value="${value.id}">${value.level}</option>`;
          });

          $(element).html(html);
          const select = new SlimSelect({ select: element });

          if (Array.isArray(selectedValues) && selectedValues.length > 0) {
            select.setSelected(selectedValues.map(String));
          }

          resolve(select);
        } else {
          ToastAlert("warning", res.message || "Something went wrong.");
          reject(res.message || "Failed to fetch levels.");
        }
      },
      error: function (xhr) {
        ToastAlert(
          "warning",
          xhr?.responseJSON?.message || "An error occurred."
        );
        reject("Error fetching levels.");
      },
    });
  });
}

function getSubjectForDropMultiple(id, selectedValues = []) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: "/admin/get-subjects-for-drop",
      method: "POST",
      success: function (res) {
        let html = `<option value="">Select Subject</option>`;
        if (res.status === 200) {
          res.data.forEach((value) => {
            html += `<option value="${value.id}">${value.subject}</option>`;
          });
        }
        $(`#${id}`).html(html);
        const select = reinitSlimSelect(id);

        // Handle multi-select values
        if (Array.isArray(selectedValues) && selectedValues.length > 0) {
          const selectedStrings = selectedValues.map(String); // ensure all are strings
          select.setSelected(selectedStrings);
        }

        if (res.status !== 200)
          ToastAlert("warning", res.message || "Something went wrong.");

        resolve(select);
      },
      error: function (xhr) {
        ToastAlert(
          "warning",
          xhr?.responseJSON?.message || "An error occurred."
        );
        reject("Error fetching subjects.");
      },
    });
  });
}

function getTopicBySubjectNLevelForDrop(
  id,
  subject,
  level,
  selectedValue = null
) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: "/admin/get-topics-by-subjects-for-drop",
      method: "POST",
      data: { id: subject, level },
      success: function (res) {
        let html = `<option value="">Select Topic</option>`;
        if (res.status === 200) {
          res.data.forEach((value) => {
            html += `<option value="${value.id}">${value.title}</option>`;
          });
        }
        $(`#${id}`).html(html);
        const select = reinitSlimSelect(id);

        if (selectedValue) {
          select.setSelected([String(selectedValue)], true);
        }

        resolve(select);
      },
      error: function (xhr) {
        ToastAlert(
          "warning",
          xhr?.responseJSON?.message || "An error occurred."
        );
        reject("Error fetching topics.");
      },
    });
  });
}

function getSubTopicByTopicForDrop(id, topic, selectedValue = null) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: "/admin/get-subtopic-by-level-for-drop",
      method: "POST",
      data: { id: topic },
      success: function (res) {
        let html = `<option value="">Select Level</option>`;
        if (res.status === 200) {
          res.data.forEach((value) => {
            html += `<option value="${value.id}">${value.title}</option>`;
          });
        }

        $(`#${id}`).html(html);

        const select = reinitSlimSelect(id);

        // setSelected only after options are injected
        if (selectedValue) {
          // convert to string just in case
          select.setSelected([String(selectedValue)], true);
        }

        resolve(select);
      },
      error: function (xhr) {
        ToastAlert(
          "warning",
          xhr?.responseJSON?.message || "An error occurred."
        );
        reject("Error fetching levels.");
      },
    });
  });
}

function getStandardsForDrop(element, selectedValue = null) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: "/admin/get-standards-for-drop",
      method: "POST",
      success: function (res) {
        let html = `<option value="">Select Standard</option>`;
        if (res.status === 200 && Array.isArray(res.data)) {
          res.data.forEach((value) => {
            html += `<option value="${value.id}">${value.standard}</option>`;
          });
        }

        $(element).html(html);
        const select = new SlimSelect({ select: element });

        if (selectedValue) {
          select.setSelected([String(selectedValue)], true);
        }

        resolve(select);
      },
      error: function (xhr) {
        ToastAlert(
          "warning",
          xhr?.responseJSON?.message || "An error occurred."
        );
        reject("Error fetching standards.");
      },
    });
  });
}

function getStandardsForDropById(id, selectedValue = null) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: "/admin/get-standards-for-drop",
      method: "POST",
      success: function (res) {
        let html = `<option value="">Select Standard</option>`;
        if (res.status === 200 && Array.isArray(res.data)) {
          res.data.forEach((value) => {
            html += `<option value="${value.id}">${value.standard}</option>`;
          });
        }

        $(`#${id}`).html(html);

        const select = reinitSlimSelect(id);

        // setSelected only after options are injected
        if (selectedValue) {
          // convert to string just in case
          select.setSelected([String(selectedValue)], true);
        }

        resolve(select);
      },
      error: function (xhr) {
        ToastAlert(
          "warning",
          xhr?.responseJSON?.message || "An error occurred."
        );
        reject("Error fetching standards.");
      },
    });
  });
}

function getOrganisationsForDrop(id, selectedValue = null) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: "/admin/get-organisations-for-drop",
      method: "POST",
      success: function (res) {
        let html = `<option value="">Select Organisations</option>`;
        if (res.status === 200) {
          res.data.forEach((value) => {
            html += `<option value="${value.id}">${value.org_name}</option>`;
          });
        }

        $(`#${id}`).html(html);

        const select = reinitSlimSelect(id);

        // setSelected only after options are injected
        if (selectedValue) {
          // convert to string just in case
          select.setSelected([String(selectedValue)], true);
        }

        resolve(select);
      },
      error: function (xhr) {
        ToastAlert(
          "warning",
          xhr?.responseJSON?.message || "An error occurred."
        );
        reject("Error fetching standards.");
      },
    });
  });
}

function getOrganisationsForDropMultiple(id, selectedValues = []) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: "/admin/get-organisations-for-drop",
      method: "POST",
      success: function (res) {
        let html = `<option value="">Select Organisations</option>`;
        if (res.status === 200) {
          res.data.forEach((value) => {
            html += `<option value="${value.id}">${value.org_name}</option>`;
          });
        }
        $(`#${id}`).html(html);
        const select = reinitSlimSelect(id);

        // Handle multi-select values
        if (Array.isArray(selectedValues) && selectedValues.length > 0) {
          const selectedStrings = selectedValues.map(String); // ensure all are strings
          select.setSelected(selectedStrings);
        }

        if (res.status !== 200)
          ToastAlert("warning", res.message || "Something went wrong.");

        resolve(select);
      },
      error: function (xhr) {
        ToastAlert(
          "warning",
          xhr?.responseJSON?.message || "An error occurred."
        );
        reject("Error fetching subjects.");
      },
    });
  });
}

function getQuestionTypesForDrop(id, selectedValue = null) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: "/admin/get-question-types-for-drop",
      method: "POST",
      success: function (res) {
        let html = `<option value="">Select Template</option>`;
        if (res.status === 200) {
          res.data.forEach((value) => {
            html += `<option value="${value.id}">${value.title}</option>`;
          });
        }

        $(`#${id}`).html(html);

        const select = reinitSlimSelect(id);

        // setSelected only after options are injected
        if (selectedValue) {
          // convert to string just in case
          select.setSelected([String(selectedValue)], true);
        }

        resolve(select);
      },
      error: function (xhr) {
        ToastAlert(
          "warning",
          xhr?.responseJSON?.message || "An error occurred."
        );
        reject("Error fetching standards.");
      },
    });
  });
}

function getQuestionTypesForDropWithTitleMultiple(id, selectedValues = []) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: "/admin/get-question-types-for-drop",
      method: "POST",
      success: function (res) {
        let html = `<option disabled value="">Select Template</option>`;
        if (res.status === 200) {
          res.data.forEach((value) => {
            html += `<option value="${value.id}">${value.title}</option>`;
          });
        }

        $(`#${id}`).html(html);

        const select = reinitSlimSelect(id);

        // Handle multi-select values
        if (Array.isArray(selectedValues) && selectedValues.length > 0) {
          const selectedStrings = selectedValues.map(String); // ensure all are strings
          select.setSelected(selectedStrings);
        }

        if (res.status !== 200)
          ToastAlert("warning", res.message || "Something went wrong.");

        resolve(select);
      },
      error: function (xhr) {
        ToastAlert(
          "warning",
          xhr?.responseJSON?.message || "An error occurred."
        );
        reject("Error fetching standards.");
      },
    });
  });
}
