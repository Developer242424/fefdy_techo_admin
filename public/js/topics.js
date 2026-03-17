$(function () {
  LoadTableData();

  new SlimSelect({
    select: "#subject",
  });
  getLevelForDrop("level");
  // new SlimSelect({
  //   select: '#multiple'
  // });

  $("#topics_create_form").submit(function (e) {
    e.preventDefault();
    LoadStart();
    const formData = new FormData(this);
    $.ajax({
      url: "/admin/topics/create",
      method: "POST",
      data: formData,
      contentType: false,
      processData: false,
      success: function (res) {
        LoadStop();
        if (res.status === 200) {
          ToastAlert("success", res.message);
          LoadTableData();
          $("#topics_create_form")[0].reset();
          $("#topics_create_modal .close").click();
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

  $("#topics_edit_form").on("submit", function (e) {
    e.preventDefault();
    LoadStart();

    const formData = new FormData(this);

    $.ajax({
      url: "/admin/topics/update",
      method: "POST",
      data: formData,
      contentType: false,
      processData: false,
      success: function (res) {
        LoadStop();
        if (res.status === 200) {
          ToastAlert("success", res.message);
          LoadTableData();
          $("#topics_edit_form")[0].reset();
          $("#topics_edit_modal .close").click();
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

  $("#audio_messages_form").on("submit", function (e) {
    e.preventDefault();
    LoadStart();

    const formData = new FormData(this);

    $.ajax({
      url: "/admin/topics/add-audio-messages",
      method: "POST",
      data: formData,
      contentType: false,
      processData: false,
      success: function (res) {
        LoadStop();
        if (res.status === 200) {
          ToastAlert("success", res.message);
          // $("#audio_messages_form")[0].reset();
          $("#audio_messages_modal .close").click();
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
});

function LoadTableData() {
  $.ajax({
    url: "/admin/topics/list",
    method: "POST",
    contentType: false,
    processData: false,
    success: function (res) {
      if (res.status === 200) {
        renderTable("topics-table", res.data);
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
      { key: "title", label: "Title", orderable: true, type: "text" },
      { key: "subject_name", label: "Subject", orderable: true, type: "text" },
      { key: "level_name", label: "Levels", orderable: true, type: "text" },
      { key: "description", label: "Description", orderable: true },
      { key: "thumbnail", label: "Thumbnail", orderable: false },
      { key: "action", label: "Actions", orderable: false },
    ],
    showEntries: ["5", "10", "20", "All"],
    search: true,
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
        url: "/admin/topics/destroy",
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

function OpenEditModal(id) {
  $.ajax({
    url: "/admin/topics/data",
    type: "POST",
    data: {
      id: id,
    },
    success: function (res) {
      if (res.status === 200) {
        let data = res.data;
        $("#edit_id").val(data.id);
        $("#edit_subject").val(data.subject);
        new SlimSelect({
          select: "#edit_subject",
        });
        getLevelForDrop("edit_level", data.level);
        $("#edit_title").val(data.title);
        $("#edit_description").val(data.description);
        $("#edit_sort_order").val(data.sort_order);
        $("#edit_thumbnail")
          .closest(".form-group")
          .find("a")
          .attr("href", `../` + data.thumbnail);
        OpenModal("topics_edit_modal");
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

function OpenAudioMessagesModal(id) {
  $("#topic_id").val(id);
  $.ajax({
    url: "/admin/topics/get-audio-messages-data",
    type: "POST",
    data: { topic: id },
    success: function (res) {
      if (res.status === 200) {
        // Build HTML dynamically
        let html = "";
        if (res.type === "update") {
          const audioData = res.data;
          // console.log(audioData);

          // ===== Categories =====
          if (audioData.categories && audioData.categories.length > 0) {
            html += `
            <div class="col-sm-12 mb-3">
              <h5 class="text-success">Categories</h5>
            </div>
          `;

            audioData.categories.forEach((cat, index) => {
              html += `
              <div class="row mb-3 align-items-end border-bottom pb-2">
                <div class="col-sm-6">
                  <div class="form-group">
                    <label>${cat.name} – Intro Audio</label>
                    <input
                      type="file"
                      accept=".mp3,.wav,.ogg,.m4a"
                      class="form-control"
                      name="audio_messages_data[categories][${index}][intro_audio]"
                    />
                    <input type="hidden" name="audio_messages_data[categories][${index}][id]" value="${
                cat.id
              }" />
                    <input type="hidden" name="audio_messages_data[categories][${index}][name]" value="${
                cat.name
              }" />
                    ${
                      cat.intro_audio
                        ? `<small class="d-block mt-1">
                          Current: <a href="/${
                            cat.intro_audio
                          }" target="_blank">${cat.intro_audio
                            .split("/")
                            .pop()}</a>
                        </small>`
                        : ""
                    }
                  </div>
                </div>

                <div class="col-sm-6">
                  <div class="form-group">
                    <label>${cat.name} – Completion Audio</label>
                    <input
                      type="file"
                      accept=".mp3,.wav,.ogg,.m4a"
                      class="form-control"
                      name="audio_messages_data[categories][${index}][completion_audio]"
                    />
                    ${
                      cat.completion_audio
                        ? `<small class="d-block mt-1">
                          Current: <a href="/${
                            cat.completion_audio
                          }" target="_blank">${cat.completion_audio
                            .split("/")
                            .pop()}</a>
                        </small>`
                        : ""
                    }
                  </div>
                </div>
              </div>
            `;
            });
          }

          // ===== Question Types =====
          if (audioData.question_type && audioData.question_type.length > 0) {
            html += `
            <div class="col-sm-12 mt-4 mb-3">
              <h5 class="text-info">Question Types</h5>
            </div>
          `;

            audioData.question_type.forEach((qt, index) => {
              html += `
              <div class="row mb-3 align-items-end border-bottom pb-2">
                <div class="col-sm-6">
                  <div class="form-group">
                    <label>${qt.name} – Intro Audio</label>
                    <input
                      type="file"
                      accept=".mp3,.wav,.ogg,.m4a"
                      class="form-control"
                      name="audio_messages_data[question_type][${index}][intro_audio]"
                    />
                    <input type="hidden" name="audio_messages_data[question_type][${index}][id]" value="${
                qt.id
              }" />
                    <input type="hidden" name="audio_messages_data[question_type][${index}][name]" value="${
                qt.name
              }" />
                    ${
                      qt.intro_audio
                        ? `<small class="d-block mt-1">
                          Current: <a href="/${
                            qt.intro_audio
                          }" target="_blank">${qt.intro_audio
                            .split("/")
                            .pop()}</a>
                        </small>`
                        : ""
                    }
                  </div>
                </div>

                <div class="col-sm-6">
                  <div class="form-group">
                    <label>${qt.name} – Completion Audio</label>
                    <input
                      type="file"
                      accept=".mp3,.wav,.ogg,.m4a"
                      class="form-control"
                      name="audio_messages_data[question_type][${index}][completion_audio]"
                    />
                    ${
                      qt.completion_audio
                        ? `<small class="d-block mt-1">
                          Current: <a href="/${
                            qt.completion_audio
                          }" target="_blank">${qt.completion_audio
                            .split("/")
                            .pop()}</a>
                        </small>`
                        : ""
                    }
                  </div>
                </div>
              </div>
            `;
            });
          }

          $("#message_form_container").html(html);
          OpenModal("audio_messages_modal");
        } else {
          // ===== Categories Section =====
          if (res.categories && res.categories.length > 0) {
            html += `
            <div class="col-sm-12 mb-3">
              <h5 class="text-success">Categories</h5>
            </div>
          `;

            res.categories.forEach((cat, index) => {
              html += `
              <div class="row mb-3 align-items-end border-bottom pb-2">
                <div class="col-sm-6">
                  <div class="form-group">
                    <label>${cat.title} – Intro Audio</label>
                    <input
                      type="file"
                      accept=".mp3,.wav,.ogg,.m4a"
                      class="form-control"
                      name="audio_messages_data[categories][${index}][intro_audio]"
                    />
                    <input type="hidden" name="audio_messages_data[categories][${index}][id]" value="${cat.id}" />
                    <input type="hidden" name="audio_messages_data[categories][${index}][name]" value="${cat.title}" />
                  </div>
                </div>
                <div class="col-sm-6">
                  <div class="form-group">
                    <label>${cat.title} – Completion Audio</label>
                    <input
                      type="file"
                      accept=".mp3,.wav,.ogg,.m4a"
                      class="form-control"
                      name="audio_messages_data[categories][${index}][completion_audio]"
                    />
                  </div>
                </div>
              </div>
            `;
            });
          }

          // ===== Question Type Section =====
          if (res.question_type && res.question_type.length > 0) {
            html += `
            <div class="col-sm-12 mt-4 mb-3">
              <h5 class="text-info">Question Types</h5>
            </div>
          `;

            res.question_type.forEach((q, index) => {
              html += `
              <div class="row mb-3 align-items-end border-bottom pb-2">
                <div class="col-sm-6">
                  <div class="form-group">
                    <label>${q.title} – Intro Audio</label>
                    <input
                      type="file"
                      accept=".mp3,.wav,.ogg,.m4a"
                      class="form-control"
                      name="audio_messages_data[question_type][${index}][intro_audio]"
                    />
                    <input type="hidden" name="audio_messages_data[question_type][${index}][id]" value="${q.id}" />
                    <input type="hidden" name="audio_messages_data[question_type][${index}][name]" value="${q.title}" />
                  </div>
                </div>
                <div class="col-sm-6">
                  <div class="form-group">
                    <label>${q.title} – Completion Audio</label>
                    <input
                      type="file"
                      accept=".mp3,.wav,.ogg,.m4a"
                      class="form-control"
                      name="audio_messages_data[question_type][${index}][completion_audio]"
                    />
                  </div>
                </div>
              </div>
            `;
            });
          }

          // Insert into modal body
          $("#message_form_container").html(html);

          // Open modal
          OpenModal("audio_messages_modal");
        }
      } else {
        ToastAlert("warning", res.message);
      }
    },
    error: function (xhr, status, error) {
      ToastAlert("error", "Error: " + error);
    },
  });
}
