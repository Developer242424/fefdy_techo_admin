$(function () {
  LoadTableData();
  getQuestionTypesForDropWithTitleMultiple("game_templates");

  $("#levellist_create_form").submit(function (e) {
    e.preventDefault();
    LoadStart();
    const formData = new FormData(this);
    $.ajax({
      url: "/admin/levelslist/create",
      method: "POST",
      data: formData,
      contentType: false,
      processData: false,
      success: function (res) {
        LoadStop();
        if (res.status === 200) {
          ToastAlert("success", res.message);
          LoadTableData();
          $("#levellist_create_form")[0].reset();
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

  $("#levelslist_edit_form").on("submit", function (e) {
    e.preventDefault();
    LoadStart();

    const formData = new FormData(this);

    $.ajax({
      url: "/admin/levelslist/update",
      method: "POST",
      data: formData,
      contentType: false,
      processData: false,
      success: function (res) {
        LoadStop();
        if (res.status === 200) {
          ToastAlert("success", res.message);
          LoadTableData();
          $("#levelslist_edit_form")[0].reset();
          $("#levelslist_edit_modal .close").click(); // Close modal
        } else if (res.status === 401) {
          res.errors.forEach((error) => {
            $("#" + error.path + "_error").text(error.msg);
          });
        } else if (res.status === 500) {
          ToastAlert("warning", res.message);
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
});

function LoadTableData() {
  $.ajax({
    url: "/admin/levelslist/list",
    method: "POST",
    contentType: false,
    processData: false,
    success: function (res) {
      if (res.status === 200) {
        renderTable("levelslist-table", res.data);
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
      { key: "level", orderable: true },
      { key: "action", orderable: false },
    ],
    showEntries: ["5", "10", "All"],
    search: true,
  });
}

async function OpenEditModal(id) {
  $.ajax({
    url: "/admin/levelslist/data",
    type: "POST",
    data: {
      id: id,
    },
    success: async function (res) {
      if (res.status === 200) {
        let data = res.data;
        $("#edit_id").val(data.id);
        $("#edit_level").val(data.level);
        const selectTemplate = await getQuestionTypesForDropWithTitleMultiple(
            "edit_game_templates",
            data.game_templates
          );
        OpenModal("levelslist_edit_modal");
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
        url: "/admin/levelslist/destroy",
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
