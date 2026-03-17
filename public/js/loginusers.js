$(function () {
  LoadTableData();
  getOrganisationsForDrop("org_id");
  getStandardsForDropById("standard");
  new SlimSelect({
    select: document.querySelector(".section-dropdown"),
  });

  getSubjectForDrop("individual_subject");
  getLevelForDrop("individual_level");
  getSubjectForDrop("edit_individual_subject");
  getLevelForDrop("edit_individual_level");

  $("#users_create_form").submit(function (e) {
    e.preventDefault();
    LoadStart();
    const formData = new FormData(this);
    $.ajax({
      url: "/admin/users/create",
      method: "POST",
      data: formData,
      contentType: false,
      processData: false,
      success: function (res) {
        LoadStop();
        if (res.status === 200) {
          ToastAlert("success", res.message);
          LoadTableData();
          $("#users_create_form")[0].reset();
          $("#users_create_modal .close").click();
          orgIndex = 0;
          editOrgIndex = 0;
        } else if (res.status === 401) {
          res.errors.forEach((error) => {
            $("#" + error.path + "_error").text(error.msg);
          });
        } else if (res.status === 400) {
          ToastAlert("warning", res.message);
        } else if (res.status === 500) {
          ToastAlert("warning", res.message);
        } else {
          ToastAlert("warning", res.message);
        }
      },
      error: function (xhr) {
        let errorMessage = "An error occurred.";
        if (xhr.responseJSON && xhr.responseJSON.message) {
          errorMessage = xhr.responseJSON.message;
        }
        ToastAlert("warning", errorMessage);
      },
    });
  });

  $("#users_edit_form").on("submit", function (e) {
    e.preventDefault();
    LoadStart();

    const formData = new FormData(this);

    $.ajax({
      url: "/admin/users/update",
      method: "POST",
      data: formData,
      contentType: false,
      processData: false,
      success: function (res) {
        LoadStop();
        if (res.status === 200) {
          ToastAlert("success", res.message);
          LoadTableData();
          $("#users_edit_form")[0].reset();
          $("#users_edit_modal .close").click();
          orgIndex = 0;
          editOrgIndex = 0;
        } else if (res.status === 401) {
          res.errors.forEach((error) => {
            $("#" + error.path + "_error").text(error.msg);
          });
        } else {
          ToastAlert("warning", res.message);
        }
      },
      error: function (xhr) {
        LoadStop();
        const errorMessage = xhr.responseJSON?.message || "An error occurred.";
        ToastAlert("warning", errorMessage);
      },
    });
  });

  $("#individual_create_form").submit(function (e) {
    e.preventDefault();
    LoadStart();
    const formData = new FormData(this);
    $.ajax({
      url: "/admin/individualuser/create",
      method: "POST",
      data: formData,
      contentType: false,
      processData: false,
      success: function (res) {
        LoadStop();
        if (res.status === 200) {
          ToastAlert("success", res.message);
          LoadTableData();
          $("#individual_create_form")[0].reset();
          $("#individual_create_modal .close").click();
          orgIndex = 0;
          editOrgIndex = 0;
        } else if (res.status === 401) {
          res.errors.forEach((error) => {
            $("#" + error.path + "_error").text(error.msg);
          });
        } else if (res.status === 400) {
          ToastAlert("warning", res.message);
        } else if (res.status === 500) {
          ToastAlert("warning", res.message);
        } else {
          ToastAlert("warning", res.message);
        }
      },
      error: function (xhr) {
        let errorMessage = "An error occurred.";
        if (xhr.responseJSON && xhr.responseJSON.message) {
          errorMessage = xhr.responseJSON.message;
        }
        ToastAlert("warning", errorMessage);
      },
    });
  });

  $("#individual_edit_form").submit(function (e) {
    e.preventDefault();
    LoadStart();
    const formData = new FormData(this);
    $.ajax({
      url: "/admin/individualuser/update",
      method: "POST",
      data: formData,
      contentType: false,
      processData: false,
      success: function (res) {
        LoadStop();
        if (res.status === 200) {
          ToastAlert("success", res.message);
          LoadTableData();
          $("#individual_edit_form")[0].reset();
          $("#individual_edit_modal .close").click();
          orgIndex = 0;
          editOrgIndex = 0;
        } else if (res.status === 401) {
          res.errors.forEach((error) => {
            $("#" + error.path + "_error").text(error.msg);
          });
        } else if (res.status === 400) {
          ToastAlert("warning", res.message);
        } else if (res.status === 500) {
          ToastAlert("warning", res.message);
        } else {
          ToastAlert("warning", res.message);
        }
      },
      error: function (xhr) {
        let errorMessage = "An error occurred.";
        if (xhr.responseJSON && xhr.responseJSON.message) {
          errorMessage = xhr.responseJSON.message;
        }
        ToastAlert("warning", errorMessage);
      },
    });
  });

  const options = {
    dateFormat: "dd-mm-yy",
    changeMonth: true,
    changeYear: true,
    yearRange: "1920:+0",
  };

  $("#dob").datepicker(options);
  $("#edit_dob").datepicker(options);
  $("#individual_dob").datepicker(options);
  $("#edit_individual_dob").datepicker(options);
});

function LoadTableData() {
  $.ajax({
    url: "/admin/users/list",
    method: "POST",
    contentType: false,
    processData: false,
    success: function (res) {
      if (res.status === 200) {
        renderTable("loginusers-table", res.data);
      } else if (res.status === 401) {
        res.errors.forEach((error) => {
          $("#" + error.path + "_error").text(error.msg);
        });
      } else {
        ToastAlert("warning", res.message);
      }
    },
    error: function (xhr) {
      let errorMessage = "An error occurred.";
      if (xhr.responseJSON && xhr.responseJSON.message) {
        errorMessage = xhr.responseJSON.message;
      }
      ToastAlert("warning", errorMessage);
    },
  });
}

function renderTable(id, data = []) {
  EasyTable(id, data, {
    columns: [
      {
        key: "org_name",
        label: "Organisation/School Name",
        orderable: true,
        type: "text",
      },
      { key: "name", label: "Student Name", orderable: true, type: "text" },
      { key: "mobile", label: "Phone Number", orderable: true, type: "text" },
      { key: "email", label: "Email", orderable: false, type: "text" },
      { key: "subject_name", label: "Subjects", orderable: true },
      { key: "type", label: "Type", orderable: true, type: "text" },
      { key: "profile_image", label: "Image", orderable: true },
      { key: "action", label: "Actions", orderable: false },
    ],
    showEntries: ["5", "10", "20", "All"],
    search: true,
  });
}

async function OpenEditModal(id) {
  try {
    $.ajax({
      url: "/admin/users/data",
      type: "POST",
      data: { id },
      success: async function (res) {
        if (res.status === 200) {
          const data = res.data;

          const selectOrganise = await getOrganisationsForDrop(
            "edit_org_id",
            JSON.parse(data.org_id)
          );
          const selectStandard = await getStandardsForDropById(
            "edit_standard",
            JSON.parse(data.standard)
          );

          setTimeout(() => {
            const sectionSelectElement = document.querySelector(
              ".edit_section-dropdown"
            );
            if (sectionSelectElement) {
              if (sectionSelectElement.slim) {
                sectionSelectElement.slim.destroy();
              }

              const editSectionSelect = new SlimSelect({
                select: ".edit_section-dropdown",
              });
              editSectionSelect.setSelected(data.section);
            }
          }, 0);

          $("#edit_id").val(data.id);
          $("#edit_name").val(data.name);
          $("#edit_mobile").val(data.mobile);
          const formattedDob = moment(data.dob, "YYYY-MM-DD").format(
            "DD-MM-YYYY"
          );
          $("#edit_dob").val(formattedDob);
          $("#edit_email").val(data.email);
          $("#edit_username").val(data.username);
          $("#edit_profile_image")
            .closest(".form-group")
            .find("a")
            .attr("href", `../${data.profile_image}`);

          OpenModal("users_edit_modal");
        } else if (res.status === 401) {
          res.errors.forEach((error) => {
            $("#" + error.path + "_error").text(error.msg);
          });
        } else {
          ToastAlert("warning", res.message);
        }
      },
      error: function (xhr, status, error) {
        ToastAlert("error", "Error: " + error, "error");
      },
    });
  } catch (err) {
    ToastAlert("error", err);
  }
}

function DeleteData(id) {
  Swal.fire({
    title: "Are you sure?",
    text: "You won't be able to revert this!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, Delete it!",
    cancelButtonText: "No, cancel!",
    reverseButtons: true,
  }).then((result) => {
    if (result.isConfirmed) {
      $.ajax({
        url: "/admin/users/destroy",
        type: "POST",
        data: {
          id: id,
        },
        success: function (res) {
          if (res.status === 200) {
            ToastAlert("success", res.message);
            LoadTableData();
          } else if (res.status === 401) {
            res.errors.forEach((error) => {
              $("#" + error.path + "_error").text(error.msg);
            });
          } else if (res.status === 400) {
            ToastAlert("warning", res.message);
          } else if (res.status === 500) {
            ToastAlert("warning", res.message);
          } else {
            ToastAlert("warning", res.message);
          }
        },
        error: function (xhr, status, error) {
          ToastAlert("error", "Error: " + error, "error");
        },
      });
    }
  });
}

async function IndividualOpenEditModal(id) {
  try {
    $.ajax({
      url: "/admin/users/data",
      type: "POST",
      data: { id },
      success: async function (res) {
        if (res.status === 200) {
          const data = res.data;
          const data1 = res.data1;

          // Populate form fields
          $("#edit_individual_id").val(data.id);
          $("#edit_individual_name").val(data.name);
          $("#edit_individual_phone").val(data.mobile);
          const formattedDob = moment(data.dob, "YYYY-MM-DD").format(
            "DD-MM-YYYY"
          );
          $("#edit_individual_dob").val(formattedDob);
          $("#edit_individual_email").val(data.email);
          $("#edit_individual_username").val(data.username);
          $("#edit_individual_profile_image")
            .closest(".form-group")
            .find("a")
            .attr("href", `../${data.profile_image}`);

          if (data1.length > 0) {
            $("#edit_rowContainer").html("");
          }
          var editOrgIndex = 0;
          for (const value of data1) {
            html = `<div class="row form-row">
                    <div class="col-sm-3">
                        <div class="form-group">
                            <label>Subject</label>
                            <select name="edit_org_details[${editOrgIndex}][subject]" class="form-control edit_subject-dropdown">
                                <option value="">Select Subject</option>
                            </select>
                            <p class="validate_error text-danger"></p>
                        </div>
                    </div>
                    <div class="col-sm-3">
                        <div class="form-group">
                            <label>Level</label>
                            <select name="edit_org_details[${editOrgIndex}][level][]" class="form-control edit_level-dropdown" multiple>
                                <option value="">Select Level</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-sm-1 d-flex align-items-end">
                        <div class="form-group">
                            <button type="button" class="btn btn-danger" data-remove-btn="">-</button>
                            <button type="button" class="btn btn-success" data-add-btn="">+</button>
                        </div>
                    </div>
                </div>`;
            const newRow = $(html);
            $("#edit_rowContainer").append(newRow);
            const subjectSelect = newRow.find(".edit_subject-dropdown")[0];
            getSubjectForDropByClass(subjectSelect, value.subject);

            const levelSelect = newRow.find(".edit_level-dropdown")[0];
            const levelSlim = getLevelForDropByClass(
              levelSelect,
              Array.isArray(value.level) ? value.level : JSON.parse(value.level)
            );
            if (value.levels) {
              getLevelForDropByClass(
                levelSelect,
                Array.isArray(value.level)
                  ? value.level
                  : JSON.parse(value.level)
              );
            }
            editOrgIndex++;
          }

          OpenModal("individual_edit_modal");
        } else if (res.status === 401) {
          res.errors.forEach((error) => {
            $("#" + error.path + "_error").text(error.msg);
          });
        } else {
          ToastAlert("warning", res.message);
        }
      },
      error: function (xhr, status, error) {
        ToastAlert("error", "Error: " + error, "error");
      },
    });
  } catch (err) {
    ToastAlert("error", err);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const container = document.getElementById("rowContainer");
  let rowIndex = 0; // track indexes for dynamic names

  container.addEventListener("click", function (e) {
    if (e.target.matches("[data-add-btn]")) {
      const tempDiv = document.createElement("div");

      tempDiv.innerHTML = `<div class="row form-row">
            <div class="col-sm-4">
                <div class="form-group">
                    <label>Subject</label>
                    <select name="org_details[${
                      rowIndex + 1
                    }][subject]" class="form-control subject-dropdown">
                    </select>
                    <p class="validate_error text-danger"></p>
                </div>
            </div>

            <div class="col-sm-4">
                <div class="form-group">
                    <label>Levels</label>
                    <select name="org_details[${
                      rowIndex + 1
                    }][level][]" class="form-control level-dropdown" multiple>
                    </select>
                    <p class="validate_error text-danger"></p>
                </div>
            </div>

            <div class="col-sm-1 d-flex align-items-end">
                <div class="form-group">
                    <button type="button" class="btn btn-danger" data-remove-btn>-</button>
                    <button type="button" class="btn btn-success" data-add-btn>+</button>
                </div>
            </div>
        </div>`;

      rowIndex++;
      const newRow = tempDiv.firstElementChild;
      container.appendChild(newRow);

      const subjectSelect = newRow.querySelector(".subject-dropdown");
      const levelSelect = newRow.querySelector(".level-dropdown");

      getSubjectForDropByClass(subjectSelect);
      getLevelForDropByClass(levelSelect);
    }

    if (e.target.matches("[data-remove-btn]")) {
      const rows = container.querySelectorAll(".form-row");
      if (rows.length > 1) {
        e.target.closest(".form-row").remove();
      } else {
        ToastAlert("warning", "At least one row is required.");
      }
    }
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const container = document.getElementById("edit_rowContainer");
  let rowIndex = 0; // track indexes for dynamic names

  container.addEventListener("click", function (e) {
    if (e.target.matches("[data-add-btn]")) {
      const tempDiv = document.createElement("div");

      tempDiv.innerHTML = `<div class="row form-row">
            <div class="col-sm-4">
                <div class="form-group">
                    <label>Subject</label>
                    <select name="edit_org_details[${
                      rowIndex + 1
                    }][subject]" class="form-control subject-dropdown">
                    </select>
                    <p class="validate_error text-danger"></p>
                </div>
            </div>

            <div class="col-sm-4">
                <div class="form-group">
                    <label>Levels</label>
                    <select name="edit_org_details[${
                      rowIndex + 1
                    }][level][]" class="form-control level-dropdown" multiple>
                    </select>
                    <p class="validate_error text-danger"></p>
                </div>
            </div>

            <div class="col-sm-1 d-flex align-items-end">
                <div class="form-group">
                    <button type="button" class="btn btn-danger" data-remove-btn>-</button>
                    <button type="button" class="btn btn-success" data-add-btn>+</button>
                </div>
            </div>
        </div>`;

      rowIndex++;
      const newRow = tempDiv.firstElementChild;
      container.appendChild(newRow);

      const subjectSelect = newRow.querySelector(".subject-dropdown");
      const levelSelect = newRow.querySelector(".level-dropdown");

      getSubjectForDropByClass(subjectSelect);
      getLevelForDropByClass(levelSelect);
    }

    if (e.target.matches("[data-remove-btn]")) {
      const rows = container.querySelectorAll(".form-row");
      if (rows.length > 1) {
        e.target.closest(".form-row").remove();
      } else {
        ToastAlert("warning", "At least one row is required.");
      }
    }
  });
});
