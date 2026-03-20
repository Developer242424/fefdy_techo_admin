function previewThumbnail(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const $img = $(input).siblings("img.thumbnail-preview-img");
      $img.attr("src", e.target.result).show();
    };
    reader.readAsDataURL(input.files[0]);
  }
}

const selectIds = ["subject", "topic", "level", "sub_topic", "question_type"];

$(document).ready(function () {
  selectIds.forEach((id) => {
    $("#" + id).on("change", checkAllSelected);
  });

  $("#export_question_type").on("change", checkAllSelected);

  updateSubmitButton();
});

function checkAllSelected() {
  const allSelected = selectIds.every((id) => {
    const el = document.getElementById(id);
    return el && el.value.trim() !== "";
  });

  const container = document.getElementById("questionCardContainer");
  const questionType = $("#question_type").val();

  if (allSelected) {
    container.style.display = "block";

    // Clear previous cards
    $("#questionCardContainer").empty();
    $("#questionCardContainer").data("active-template", "");

    // For Question_Type 2, append BOTH question and instruction blocks
    if (questionType === "2") {
      const questionBlock = $("#matchquestionCardTemplate").html();
      const instructionBlock = $("#matchInstructionCardTemplate").html();
      if (questionBlock) {
        $("#questionCardContainer").append($(questionBlock));
        $("#questionCardContainer").data("active-template", "");
      }
      if (instructionBlock) {
        $("#questionCardContainer").append($(instructionBlock));
        $("#questionCardContainer").data("active-template", "");
      }
    } else if (questionType === "1") {
      const templateHtml = $("#questionCardTemplate").html();
      if (templateHtml) {
        $("#questionCardContainer").append($(templateHtml));
        $("#questionCardContainer").data("active-template", "");
      }
    } else if (questionType === "3") {
      // ✅ corrected from "1"
      const templateHtml = $("#dragquestionCardTemplate").html();
      if (templateHtml) {
        $("#questionCardContainer").append($(templateHtml));
        $("#questionCardContainer").data("active-template", "");
      }
    } else if (questionType === "4") {
      const questionBlock = $("#InsmatchquestionCardTemplate").html();
      const instructionBlock = $(
        "#instructionMatchQuestionCardTemplate"
      ).html();
      if (questionBlock) {
        $("#questionCardContainer").append($(questionBlock));
        $("#questionCardContainer").data("active-template", "");
      }
      if (instructionBlock) {
        $("#questionCardContainer").append($(instructionBlock));
        $("#questionCardContainer").data("active-template", "");
      }
    } else if (questionType === "5") {
      const questionBlock = $("#labelquestionCardTemplate").html();
      if (questionBlock) {
        const appended = $(questionBlock).appendTo("#questionCardContainer");

        $("#questionCardContainer").data("active-template", "label-editor");

        InitialEditorTemplate(appended);
      }
    } else if (questionType === "6") {
      const questionBlock = $("#identifyquestionCardTemplate").html();
      if (questionBlock) {
        const appended = $(questionBlock).appendTo("#questionCardContainer");

        $("#questionCardContainer").data("active-template", "label-editor");

        IdentifyEditorTemplate(appended[0]);
      }
    } else if (questionType === "7") {
      const questionBlock = $("#draganddropquestionCardTemplate").html();
      if (questionBlock) {
        const appended = $(questionBlock).appendTo("#questionCardContainer");

        $("#questionCardContainer").data("active-template", "label-editor");

        dragAndDropEditorTemplate(appended[0]);
      }
    }
    renumberCards();
    updateSubmitButton();
  } else {
    container.style.display = "none";
    $("#questionCardContainer").empty();
  }
}

function updateSubmitButton() {
  // Remove previous button only inside this form
  $("#questionCardContainer .form-submit-button").remove();

  const btnText = $("#questionCardContainer").data("submit-text") || "Submit";
  const activeTemplate = $("#questionCardContainer").data("active-template");

  const isLabelEditor = activeTemplate === "label-editor";

  const $submitBtn = $(`
    <div class="text-end mt-3">
      <button type="submit" class="btn btn-info form-submit-button"${isLabelEditor ? "disabled" : ""
    }>${btnText}</button>
    </div>
  `);

  // Append to the wrapper form (outside all question-cards)
  $("#questionCardContainer").append($submitBtn);
}

// ✅ ADD NEW CARD
$(document).on("click", ".add-icon", function () {
  const questionType = $("#question_type").val();
  let templateHtml = "";

  if (questionType === "2") {
    templateHtml = $("#matchInstructionCardTemplate").html();
  } else if (questionType === "1") {
    templateHtml = $("#questionCardTemplate").html();
  } else if (questionType === "3") {
    // ✅ corrected from "1"
    templateHtml = $("#dragquestionCardTemplate").html();
  } else if (questionType === "4") {
    // ✅ corrected from "1"
    templateHtml = $("#instructionMatchQuestionCardTemplate").html();
  } else if (questionType === "5") {
    // ✅ corrected from "1"
    templateHtml = $("#labelquestionCardTemplate").html();
  } else if (questionType === "6") {
    // ✅ corrected from "1"
    templateHtml = $("#identifyquestionCardTemplate").html();
  } else if (questionType === "7") {
    // ✅ corrected from "1"
    templateHtml = $("#draganddropquestionCardTemplate").html();
  }

  if (!templateHtml) {
    console.warn("❗ Template not found for question type:", questionType);
    return;
  }

  const $card = $(templateHtml);
  $("#questionCardContainer").append($card);

  renumberCards(); // 💡 call after adding
  updateSubmitButton();
});

// ✅ DELETE CARD
$(document).on("click", ".delete-icon", function () {
  const questionType = $("#question_type").val();

  // When dealing with Question_Type 2, restrict deletion of all match-instruction cards
  if (questionType === "2" || questionType === "4") {
    const $instructionCards = $(".match-instruction-card");

    if ($instructionCards.length <= 1) {
      ToastAlert("warning", "At least one instruction block is required.");
      return;
    }
  } else if (questionType === "1") {
    // Default restriction for all cards (if needed)
    const $cards = $(".question-card");
    if ($cards.length <= 1) {
      ToastAlert("warning", "At least one question block is required.");
      return;
    }
  }

  // Proceed with delete
  $(this).closest(".question-card").remove();
  renumberCards();
  updateSubmitButton();
});

function renumberCards() {
  $(".question-card").each(function (index) {
    // Remove old cardX class
    const $card = $(this);
    const classes = $card.attr("class").split(/\s+/);

    // Remove any class that starts with "card" followed by a number
    classes.forEach((c) => {
      if (/^card\d+$/.test(c)) {
        $card.removeClass(c);
      }
    });

    // Add new class
    $card.addClass("card" + index);

    $card.find("textarea, input, select").each(function () {
      const $input = $(this);
      const nameAttr = $input.attr("name");
      //   console.log("Old name "+nameAttr);
      if (nameAttr && nameAttr.includes("array[")) {
        // console.log(index);
        const newName = nameAttr.replace(/array\[\d*\]/, `array[${index}]`);
        // console.log("New name "+newName);
        $input.attr("name", newName);
      } else {
        // console.log("false");
      }
    });
  });
}

// LIMIT TO 2 CHECKBOXES
$(document).on("change", ".question-card input[type='checkbox']", function () {
  const $card = $(this).closest(".question-card");
  const $checkboxes = $card.find("input[type='checkbox']");
  const checkedCount = $checkboxes.filter(":checked").length;

  if (checkedCount > 2) {
    this.checked = false;
    ToastAlert("warning", "You can only select up to 2 options.");
  }
});

// functionality Scripts
$(function () {
  LoadTableData();

  getSubjectForDrop("subject");
  getLevelForDrop("level");
  $("#subject").on("change", function () {
    getTopicBySubjectNLevelForDrop("topic", $(this).val(), $("#level").val());
  });
  $("#level").on("change", function () {
    getTopicBySubjectNLevelForDrop("topic", $("#subject").val(), $(this).val());
  });
  $("#topic").on("change", function () {
    getSubTopicByTopicForDrop("sub_topic", $(this).val());
  });
  getQuestionTypesForDrop("question_type");

  getSubjectForDrop("subject_filter");
  getLevelForDrop("level_filter");
  $("#subject_filter").on("change", function () {
    getTopicBySubjectNLevelForDrop(
      "topic_filter",
      $(this).val(),
      $("#level_filter").val()
    );
  });
  $("#level_filter").on("change", function () {
    getTopicBySubjectNLevelForDrop(
      "topic_filter",
      $("#subject_filter").val(),
      $(this).val()
    );
  });
  $("#topic_filter").on("change", function () {
    getSubTopicByTopicForDrop("sub_topic_filter", $(this).val());
  });
  getQuestionTypesForDrop("question_type_filter");

  $("#questions_create_form").submit(function (e) {
    e.preventDefault();
    $(this).append(`<div class="loading">Loading&#8230;</div>`);
    LoadStart();
    const formData = new FormData(this);
    $.ajax({
      url: "/admin/create-questions/create",
      method: "POST",
      data: formData,
      contentType: false,
      processData: false,
      success: function (res) {
        LoadStop();
        if (res.status === 200) {
          ToastAlert("success", res.message);
          location.reload();
          $("#questions_create_form")[0].reset();
        } else if (res.status === 401) {
          res.errors.forEach((error) => {
            $("#" + error.path + "_error").text(error.msg);
          });
          $(".loading").remove();
        } else if (res.status === 400) {
          $(".loading").remove();
          ToastAlert("warning", res.message);
        } else if (res.status === 500) {
          $(".loading").remove();
          ToastAlert("warning", res.message);
        } else {
          $(".loading").remove();
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

  $("#question_list_edit_form").on("submit", function (e) {
    e.preventDefault();
    LoadStart();

    const formData = new FormData(this);

    $.ajax({
      url: "/admin/questions-list/update",
      method: "POST",
      data: formData,
      contentType: false,
      processData: false,
      success: function (res) {
        LoadStop();
        if (res.status === 200) {
          ToastAlert("success", res.message);
          LoadTableData();
          $("#question_list_edit_form")[0].reset();
          $("#question_list_edit_modal .close").click();
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
  
  $("#question_template_edit_form").on("submit", function (e) {
    // alert("edit")
    e.preventDefault();
    LoadStart();

    const formData = new FormData(this);

    $.ajax({
      url: "/admin/questions-list/update",
      method: "POST",
      data: formData,
      contentType: false,
      processData: false,
      success: function (res) {
        LoadStop();
        if (res.status === 200) {
          ToastAlert("success", res.message);
          LoadTableData();
          $("#question_template_edit_form")[0].reset();
          $("#question_list_template_edit_modal .close").click();
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
    url: "/admin/questions-list/list",
    method: "POST",
    data: {
      subject: $("#subject_filter").val(),
      topic: $("#topic_filter").val(),
      level: $("#level_filter").val(),
      sub_topic: $("#sub_topic_filter").val(),
      question_type: $("#question_type_filter").val(),
    },
    success: function (res) {
      if (res.status === 200) {
        renderTable("questions-table", res.data);
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
        key: "question_text",
        label: "Question",
        orderable: true,
        type: "text",
      },
      {
        key: "question_type",
        label: "Question Type",
        orderable: true,
        type: "text",
      },
      {
        key: "question_thumbnail",
        label: "Thumbnail",
        orderable: false,
      },
      { key: "action", label: "Actions", orderable: false },
    ],
    showEntries: ["5", "10", "20", "All"],
    search: true,
  });
}

function OpenEditModal(id, type) {
  try {
    $.ajax({
      url: "/admin/questions-list/data",
      type: "POST",
      data: { id },
      success: async function (res) {
        if (res.status === 200) {
          const data = res.data;
          if (type === 1 || type === "1") {
            let ques_html_cho = makeHTMLforChooseUp(id, type, data.data);
            $(".questions_container").html(ques_html_cho);
            OpenModal("question_list_edit_modal");
          } else if (type === 2 || type === "2") {
            let ques_html_mat = makeHTMLforMatchUp(id, type, data.data);
            $(".questions_container").html(ques_html_mat);
            OpenModal("question_list_edit_modal");
          } else if (type === 3 || type === "3") {
            let ques_html_mat = makeHTMLforDragOne(id, type, data.data);
            $(".questions_container").html(ques_html_mat);
            OpenModal("question_list_edit_modal");
          } else if (type === 4 || type === "4") {
            let ques_html_mat = makeHTMLforInstructionMatchUp(
              id,
              type,
              data.data
            );
            $(".questions_container").html(ques_html_mat);
            OpenModal("question_list_edit_modal");
          } else if (type === 7 || type === "7") {
            let ques_html_mat = makeHTMLforDragDrop3(id, type, data.data);
            $(".questions_template_container").html(ques_html_mat);
            OpenModal("question_list_template_edit_modal");
            // console.log("data", data.data[0])
            setTimeout(() => {
                renderScriptForDrafDrop3(document.querySelector('.gge-editor-root'), data.data[0]);
                // dragAndDropEditorTemplate(document.querySelector('.gge-editor-root'));
            }, 200);
          } else {
            return false;
          }
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
        url: "/admin/questions-list/destroy",
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

function disableSubmit() {
  $("#questionCardContainer .form-submit-button").attr("disabled", true);
}

function makeHTMLforMatchUp(id, type, data) {
  let html = ``;
  data.forEach((value, index) => {
    if (index !== 0) {
      html += `<div class="row border_1 mb-1">
        <div class="col-sm-12">
          <div class="form-group">
            <label for="array[${index}][instruction]">Instruction</label>
            <textarea class="form-control new" name="array[${index}][instruction]" rows="1">${value.instruction ?? ""
        }</textarea>
            <p class="validate_error text-danger" id="array[${index}][instruction]_error"></p>
          </div>
        </div>

        <div class="col-sm-6">
          <div class="row">
            <div class="col-sm-7">
              <div class="form-group">
                <label for="array[${index}][is_euqal_one][text]">Label</label>
                <textarea class="form-control" name="array[${index}][is_euqal_one][text]" rows="1">${value.is_euqal_one?.text ?? ""
        }</textarea>
                <p class="validate_error text-danger" id="array[${index}][is_euqal_one][text]_error"></p>
              </div>
            </div>

            <div class="col-sm-4">
              <div class="form-group">
                <label>Thumbnail</label>
                <div class="thumbnail-box" onclick="this.querySelector('input[type=file]').click();">
                  <i class="material-icons">image</i>
                  <img class="thumbnail-preview-img" src="../${value.is_euqal_one?.thumbnail ?? ""
        }">
                  <input type="file" name="array[${index}][is_euqal_one][thumbnail]" class="thumbnail-input" accept="image/*" style="display:none;" onchange="previewThumbnail(this)">
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-sm-6">
          <div class="row">
            <div class="col-sm-7">
              <div class="form-group">
                <label for="array[${index}][is_euqal_two][text]">Label</label>
                <textarea class="form-control" name="array[${index}][is_euqal_two][text]" rows="1">${value.is_euqal_two?.text ?? ""
        }</textarea>
                <p class="validate_error text-danger" id="array[${index}][is_euqal_two][text]_error"></p>
              </div>
            </div>

            <div class="col-sm-4">
              <div class="form-group">
                <label>Thumbnail</label>
                <div class="thumbnail-box" onclick="this.querySelector('input[type=file]').click();">
                  <i class="material-icons">image</i>
                  <img class="thumbnail-preview-img" src="../${value.is_euqal_two?.thumbnail ?? ""
        }">
                  <input type="file" name="array[${index}][is_euqal_two][thumbnail]" class="thumbnail-input" accept="image/*" style="display:none;" onchange="previewThumbnail(this)">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    } else {
      html += `<div class="row">
        <div class="col-sm-12">
          <div class="form-group">
            <label for="array[${index}][question]">Question</label>
            <textarea class="form-control new" name="array[${index}][question]" rows="2">${value.question ?? ""
        }</textarea>
            <p class="validate_error text-danger" id="array[${index}][question]_error"></p>
          </div>
        </div>
      </div>`;
    }
  });
  html += `<input type="hidden" name="id" value="${id}">`;
  html += `<input type="hidden" name="question_type" value="${type}">`;

  return html;
}

function makeHTMLforInstructionMatchUp(id, type, data) {
  let html = ``;
  data.forEach((value, index) => {
    if (index !== 0) {
      html += `<div class="row border_1 mb-1">
        <div class="col-sm-12">
          <div class="form-group">
            <label for="array[${index}][instruction]">Instruction</label>
            <textarea class="form-control new" name="array[${index}][instruction]" rows="1">${value.instruction ?? ""
        }</textarea>
            <p class="validate_error text-danger" id="array[${index}][instruction]_error"></p>
          </div>
        </div>
        <div class="col-sm-12">
          <div class="form-group">
            <label for="array[${index}][inner_instruction]">Second Instruction</label>
            <textarea class="form-control new" name="array[${index}][inner_instruction]" rows="1">${value.inner_instruction ?? ""
        }</textarea>
            <p class="validate_error text-danger" id="array[${index}][inner_instruction]_error"></p>
          </div>
        </div>

        <div class="col-sm-6">
          <div class="row">
            <div class="col-sm-7">
              <div class="form-group">
                <label for="array[${index}][is_equal_one][text]">Label</label>
                <textarea class="form-control" name="array[${index}][is_equal_one][text]" rows="1">${value.is_equal_one?.text ?? ""
        }</textarea>
                <p class="validate_error text-danger" id="array[${index}][is_equal_one][text]_error"></p>
              </div>
            </div>

            <div class="col-sm-4">
              <div class="form-group">
                <label>Thumbnail</label>
                <div class="thumbnail-box" onclick="this.querySelector('input[type=file]').click();">
                  <i class="material-icons">image</i>
                  <img class="thumbnail-preview-img" src="../${value.is_equal_one?.thumbnail ?? ""
        }">
                  <input type="file" name="array[${index}][is_equal_one][thumbnail]" class="thumbnail-input" accept="image/*" style="display:none;" onchange="previewThumbnail(this)">
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-sm-6">
          <div class="row">
            <div class="col-sm-7">
              <div class="form-group">
                <label for="array[${index}][is_equal_two][text]">Label</label>
                <textarea class="form-control" name="array[${index}][is_equal_two][text]" rows="1">${value.is_equal_two?.text ?? ""
        }</textarea>
                <p class="validate_error text-danger" id="array[${index}][is_equal_two][text]_error"></p>
              </div>
            </div>

            <div class="col-sm-4">
              <div class="form-group">
                <label>Thumbnail</label>
                <div class="thumbnail-box" onclick="this.querySelector('input[type=file]').click();">
                  <i class="material-icons">image</i>
                  <img class="thumbnail-preview-img" src="../${value.is_equal_two?.thumbnail ?? ""
        }">
                  <input type="file" name="array[${index}][is_equal_two][thumbnail]" class="thumbnail-input" accept="image/*" style="display:none;" onchange="previewThumbnail(this)">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    } else {
      html += `<div class="row">
        <div class="col-sm-12">
          <div class="form-group">
            <label for="array[${index}][question]">Question</label>
            <textarea class="form-control new" name="array[${index}][question]" rows="2">${value.question ?? ""
        }</textarea>
            <p class="validate_error text-danger" id="array[${index}][question]_error"></p>
          </div>
        </div>
      </div>`;
    }
  });
  html += `<input type="hidden" name="id" value="${id}">`;
  html += `<input type="hidden" name="question_type" value="${type}">`;

  return html;
}

[
  {
    question: "Drag the items and drop",
  },
  {
    name: "No Face",
    images: [
      "uploads/questions/1756894025603-478157528.png",
      "uploads/questions/1756894025604-833922662.png",
    ],
  },
  {
    name: "Dummy",
    images: [
      "uploads/questions/1756894025604-438999995.jpeg",
      "uploads/questions/1756894025606-4816251.png",
      "uploads/questions/1756894025606-45869527.png",
    ],
  },
];

// Drag one
function makeHTMLforDragOne(id, type, data) {
  let html = ``;
  data.forEach((value, index) => {
    if (index !== 0) {
      html += `<div class="row border_1 mb-1">
            <div class="col-sm-12">
              <div class="form-group">
                <label for="array[${index}][name]">option ${index}</label>
                <textarea class="form-control new" name="array[${index}][name]" rows="1">${value.name ?? ""
        }</textarea>
                <p class="validate_error text-danger" id="array[${index}][name]_error"></p>
              </div>
          <div class="col-lg-12">
              <div class="form-group mt-4">
                <!-- Choose Images Button -->
                <label for="thumbnail-upload-${index}" class="btn btn-primary">Choose Images</label>
            
                <input  type="file" id="thumbnail-upload-${index}"  name="array[${index}][images][]"  class="thumbnail-input"multiple accept="image/*"onchange="previewThumbnailedit(this, 'preview-container_edit_option-${index}')" style="display:none;">
            
                <!-- Preview Container -->
              <div class="col-sm-12">
              <div class="row mt-2">
                <div id="preview-container_edit_option-${index}" class="col-12 d-flex">
                  <!-- Previews will appear here -->
                </div>
              </div>
      </div>
            
      
          <div class="col-lg-12 d-flex preview_old_images">`;
      for (const img of value.images || []) {
        html += `<div class="form-group mt-4 position-relative m-2" style="width:100px;height:100px;">
                <img src="/${img}" class="img-thumbnail" style="width:100%; height:100%;object-fit:cover;">
                <button type="button" 
                        class="btn btn-sm btn-danger position-absolute top-0 end-0" 
                        style="border-radius:50%;" 
                        onclick="removeImageDragOne(${id}, ${type}, '${value.name}', '${img}')">&times;</button>
              </div>`;
      }
      html += `</div>
               
               
            </div>
          </div>
        </div>
          </div>`;
    } else {
      html += `<div class="row">
            <div class="col-sm-12">
              <div class="form-group">
                <label for="array[${index}][question]">Question</label>
                <textarea class="form-control new" name="array[${index}][question]" rows="2">${value.question ?? ""
        }</textarea>
                <p class="validate_error text-danger" id="array[${index}][question]_error"></p>
              </div>
            </div>
          </div>`;
    }
  });
  html += `<input type="hidden" name="id" value="${id}">`;
  html += `<input type="hidden" name="question_type" value="${type}">`;

  return html;
}

function removeImageDragOne(id, type, name, img) {
  if (type === 3 || type === "3") {
    $.ajax({
      url: "/admin/questions-list/remove-image/drag-one",
      type: "POST",
      data: {
        id: id,
        name: name,
        img: img,
      },
      success: function (res) {
        if (res.status === 200) {
          ToastAlert("success", res.message);
          $(`img[src='/${img}']`).parent().remove(); // Remove the image from the UI
        } else {
          ToastAlert("warning", res.message);
        }
      },
      error: function (xhr, status, error) {
        ToastAlert("error", "Error: " + error, "error");
      },
    });
  }
}

// drag one end

function makeHTMLforChooseUp(id, type, data) {
  let html = `<div class="row">
    <div class="col-sm-8">
      <div class="form-group">
        <label for="question[text]">Question</label>
        <textarea class="form-control" name="question[text]" rows="4">${data.question.text ?? ""
    }</textarea>
        <p class="validate_error text-danger" id="question_text_error"></p>
      </div>
    </div>

    <div class="col-sm-4">
      <div class="form-group">
        <label for="question[thumbnail]">Thumbnail</label>
        <div class="thumbnail-box" onclick="this.querySelector('input[type=file]').click();">
          <i class="material-icons">image</i>
          <img class="thumbnail-preview-img" src="../${data.question.thumbnail ?? ""
    }">
          <input type="file" class="thumbnail-input" name="question[thumbnail]" accept="image/*" style="display:none;" onchange="previewThumbnail(this)">
        </div>
      </div>
    </div>
  </div>

  <div class="row">`;

  const options = ["a", "b", "c", "d"];

  options.forEach((opt, index) => {
    const label = String.fromCharCode(65 + index);
    const option = data.option[`option_${opt}`] || {};
    html += `
<div class="col-sm-6">
  <div class="row">
    <div class="col-sm-7">
      <div class="option-box">
        <label>
          <input
            type="checkbox"
            name="option[option_${opt}][is_answer]"
            class="limit-checkbox"
            ${option.is_answer ? "checked" : ""}
          /> Option ${label}
        </label>

        <label for="option[option_${opt}][primary_text]">Primary Text</label>
        <textarea
          class="form-control"
          name="option[option_${opt}][primary_text]"
          rows="1"
        >${option.primary_text ?? ""}</textarea>

        <label for="option[option_${opt}][secondary_text]">Secondary Text</label>
        <textarea
          class="form-control"
          name="option[option_${opt}][secondary_text]"
          rows="3"
        >${option.secondary_text ?? ""}</textarea>

        <p
          class="validate_error text-danger"
          id="option_option_${opt}_text_error"
        ></p>
      </div>
    </div>

    <div class="col-sm-4">
      <div class="option-box">
        <label for="option[option_${opt}][thumbnail]">Thumbnail</label>
        <div
          class="thumbnail-box"
          onclick="this.querySelector('input[type=file]').click();"
        >
          <i class="material-icons">image</i>
          <img
            class="thumbnail-preview-img"
            src="../${option.thumbnail ?? ""}" style="display:none;"
          />
          <input
            type="file" 
            class="thumbnail-input"
            name="option[option_${opt}][thumbnail]"
            accept="image/*"
            style="display:none;"
            onchange="previewThumbnail(this)"
          />
        </div>
      </div>
    </div>
  </div>
</div>
`;
  });

  html += `</div>`;
  html += `<input type="hidden" name="id" value="${id}">`;
  html += `<input type="hidden" name="question_type" value="${type}">`;
  return html;
}

// For Drag And Drop -->

const fileStorage = {};

function previewThumbnail1(input, containerId) {
  const previewContainer = document.getElementById(containerId);
  const inputId = input.id;

  if (!fileStorage[inputId]) {
    fileStorage[inputId] = new DataTransfer();
  }
  const dt = fileStorage[inputId];
  Array.from(input.files).forEach((file) => {
    if (dt.items.length < 8) {
      dt.items.add(file);
    } else {
      alert("You can upload a maximum of 8 images.");
      return;
    }
  });

  input.files = dt.files;

  previewContainer.innerHTML = "";

  Array.from(input.files).forEach((file, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "position-relative d-inline-block m-1";
    wrapper.style.width = "80px";
    wrapper.style.height = "80px";

    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.className = "img-thumbnail";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";

    const removeBtn = document.createElement("span");
    removeBtn.innerHTML = "&times;";
    removeBtn.className = "btn btn-sm btn-danger position-absolute";
    removeBtn.style.top = "0";
    removeBtn.style.right = "0";
    removeBtn.style.lineHeight = "15px";
    removeBtn.style.padding = "0px 5px";
    removeBtn.style.cursor = "pointer";
    removeBtn.title = "Remove";

    removeBtn.onclick = () => {
      let newDt = new DataTransfer();
      Array.from(input.files).forEach((f, i) => {
        if (i !== index) newDt.items.add(f);
      });

      fileStorage[inputId] = newDt;
      input.files = newDt.files;

      refreshPreview(input, containerId);
    };

    wrapper.appendChild(img);
    wrapper.appendChild(removeBtn);
    previewContainer.appendChild(wrapper);
  });

  console.log("Updated:", input.name, input.files);
}

function clearFileStorage() {
  Object.keys(fileStorage).forEach((key) => {
    fileStorage[key] = new DataTransfer();
  });
}

function refreshPreview(input, containerId) {
  const previewContainer = document.getElementById(containerId);
  previewContainer.innerHTML = "";

  Array.from(input.files).forEach((file, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "position-relative d-inline-block m-1";
    wrapper.style.width = "80px";
    wrapper.style.height = "80px";

    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.className = "img-thumbnail";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";

    const removeBtn = document.createElement("span");
    removeBtn.innerHTML = "&times;";
    removeBtn.className = "btn btn-sm btn-danger position-absolute";
    removeBtn.style.top = "0";
    removeBtn.style.right = "0";
    removeBtn.style.lineHeight = "15px";
    removeBtn.style.padding = "0px 5px";
    removeBtn.style.cursor = "pointer";
    removeBtn.title = "Remove";

    removeBtn.onclick = () => {
      let newDt = new DataTransfer();
      Array.from(input.files).forEach((f, i) => {
        if (i !== index) newDt.items.add(f);
      });

      const inputId = input.id;
      fileStorage[inputId] = newDt;
      input.files = newDt.files;
      refreshPreview(input, containerId);
    };

    wrapper.appendChild(img);
    wrapper.appendChild(removeBtn);
    previewContainer.appendChild(wrapper);
  });
}

// drag one

const fileStorageEdit = {};

function previewThumbnailedit(input, containerId) {
  const previewContainer = document.getElementById(containerId);
  const inputId = input.id;

  if (!fileStorageEdit[inputId]) {
    fileStorageEdit[inputId] = new DataTransfer();
  }

  const dt = fileStorageEdit[inputId];
  Array.from(input.files).forEach((file) => {
    if (!file.type.startsWith("image/")) return;
    dt.items.add(file);
  });

  Array.from(
    previewContainer.querySelectorAll("[data-uploaded='true']")
  ).forEach((el) => el.remove());

  Array.from(dt.files).forEach((file, index) => {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const wrapper = document.createElement("div");
      wrapper.classList.add("position-relative", "m-2");
      wrapper.style.width = "100px";
      wrapper.style.height = "100px";
      wrapper.setAttribute("data-uploaded", "true");

      wrapper.innerHTML = `
        <img src="${e.target.result}" 
             class="img-thumbnail" 
             style="width:100%;height:100%;object-fit:cover;">
        <button type="button" 
                class="btn btn-sm btn-danger position-absolute top-0 end-0" 
                style="border-radius:50%;" 
                onclick="removeImage(${index}, '${input.id}', '${containerId}')">&times;</button>
      `;
      previewContainer.appendChild(wrapper);
    };
    reader.readAsDataURL(file);
  });

  input.files = dt.files;
}

function removeImage(index, inputId, containerId) {
  const input = document.getElementById(inputId);

  const dt = new DataTransfer();
  Array.from(input.files).forEach((file, i) => {
    if (i !== index) dt.items.add(file);
  });

  fileStorageEdit[inputId] = dt;
  input.files = dt.files;

  refreshPreviewEdit(input, containerId);
}

function refreshPreviewEdit(input, containerId) {
  const previewContainer = document.getElementById(containerId);

  Array.from(
    previewContainer.querySelectorAll("[data-uploaded='true']")
  ).forEach((el) => el.remove());

  Array.from(input.files).forEach((file, index) => {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const wrapper = document.createElement("div");
      wrapper.classList.add("position-relative", "m-2");
      wrapper.style.width = "100px";
      wrapper.style.height = "100px";
      wrapper.setAttribute("data-uploaded", "true");

      wrapper.innerHTML = `
        <img src="${e.target.result}" 
             class="img-thumbnail" 
             style="width:100%;height:100%;object-fit:cover;">
        <button type="button" 
                class="btn btn-sm btn-danger position-absolute top-0 end-0" 
                style="border-radius:50%;" 
                onclick="removeImage(${index}, '${input.id}', '${containerId}')">&times;</button>
      `;
      previewContainer.appendChild(wrapper);
    };
    reader.readAsDataURL(file);
  });
}
function clearFileStorageEdit() {
  Object.keys(fileStorageEdit).forEach((key) => {
    fileStorageEdit[key] = new DataTransfer();
  });
}

function InitialEditorTemplate(container) {
  let selectedElement = null;
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let dropzoneMap = {};

  const imgBtn = container.find("#imgBtn");
  const imgInput = container.find("#imgInput");
  const previewImg = container.find("#previewImg")[0];
  const dropzoneBtn = container.find("#dropzoneBtn");
  const lineBtn = container.find("#lineBtn");
  const questionText = container.find("#editor_questionText");
  const editor_html_val = container.find("#editor_html_val");
  const imageBox = container.find("#imageBox")[0];
  const answerBox = container.find("#answerBox")[0];
  const deleteBtn = container.find("#deleteBtn");

  const styleWidth = container.find("#styleWidth");
  const styleHeight = container.find("#styleHeight");
  const styleColor = container.find("#styleColor");
  const styleBorder = container.find("#styleBorder");
  const styleThickness = container.find("#styleThickness");
  const borderField = container.find("#borderField");
  const thicknessField = container.find("#thicknessField");

  const dropzoneFields = container.find("#dropzoneFields");
  const valueFields = container.find("#valueFields");
  const dropzoneName = container.find("#dropzoneName");
  const dropzoneValue = container.find("#dropzoneValue");
  const nameError = container.find("#nameError");

  // const publicURL = "https://demoadmin.fefdybraingym.com/public/";
  // const assetURL = "https://demoadmin.fefdybraingym.com/public/uploads/editor-img/";

  const publicURL = "http://localhost:5001/";
  const assetURL = "http://localhost:5001/uploads/editor-img/";

  let uploadedImageName = "";

  // ---------------------------------------------------------------------
  // IMAGE UPLOAD
  // ---------------------------------------------------------------------
  imgBtn.on("click", () => {
    imgInput.click();
  });

  imgInput.on("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("editor_image", file);

    $.ajax({
      url: "/admin/image-upload",
      type: "POST",
      data: formData,
      processData: false,
      contentType: false,
      success: function (res) {
        console.log("Uploaded:", res.filename);
        uploadedImageName = res.filename;

        // show uploaded image
        previewImg.src = assetURL + uploadedImageName;
        previewImg.style.display = "block";
      },
      error: function () {
        console.error("Upload failed");
      },
    });
  });

  // ---------------------------------------------------------------------
  // CREATE DROPZONE
  // ---------------------------------------------------------------------
  dropzoneBtn.on("click", () => {
    const dropzone = document.createElement("div");
    dropzone.className = "dropzone";
    dropzone.style.left = "80px";
    dropzone.style.top = "50px";
    imageBox.appendChild(dropzone);

    attachElementHandlers(dropzone);
    selectElement(dropzone);
  });

  // ---------------------------------------------------------------------
  // CREATE LINE
  // ---------------------------------------------------------------------
  lineBtn.on("click", () => {
    const line = document.createElement("div");
    line.className = "line";
    line.style.left = "80px";
    line.style.top = "50px";
    imageBox.appendChild(line);

    attachElementHandlers(line);
    selectElement(line);
  });

  // ---------------------------------------------------------------------
  // ATTACH ELEMENT HANDLERS (mousedown)
  // ---------------------------------------------------------------------
  function attachElementHandlers(element) {
    element.addEventListener("mousedown", (e) => {
      selectElement(element);
      startDrag(e, element);
    });
  }

  // ---------------------------------------------------------------------
  // SELECT ELEMENT
  // ---------------------------------------------------------------------
  function selectElement(element) {
    if (selectedElement) {
      selectedElement.classList.remove("selected");
    }

    selectedElement = element;
    element.classList.add("selected");

    const isDropzone = element.classList.contains("dropzone");
    const isLine = element.classList.contains("line");

    styleWidth.val(parseInt(element.style.width) || (isDropzone ? 80 : 80));
    styleHeight.val(parseInt(element.style.height) || (isDropzone ? 40 : 2));
    styleColor.val(
      element.style.backgroundColor
        ? rgbToHex(element.style.backgroundColor)
        : isDropzone
          ? "#ffffff"
          : "#000000"
    );

    if (isDropzone) {
      borderField.show();
      thicknessField.hide();
      dropzoneFields.addClass("show");
      valueFields.addClass("show");

      styleBorder.val(
        element.style.borderColor
          ? rgbToHex(element.style.borderColor)
          : "#000000"
      );

      dropzoneName.val(element.dataset.zoneName || "");
      dropzoneValue.val(element.dataset.zoneValue || "");
      nameError.text("");
      dropzoneName.removeClass("error");
    } else if (isLine) {
      borderField.hide();
      thicknessField.show();
      dropzoneFields.removeClass("show");
      valueFields.removeClass("show");
      styleThickness.val(parseInt(element.style.height) || 2);
    } else {
      dropzoneFields.removeClass("show");
      valueFields.removeClass("show");
      borderField.hide();
      thicknessField.hide();
    }
  }

  // ---------------------------------------------------------------------
  // DRAG HANDLER
  // ---------------------------------------------------------------------
  function startDrag(e, element) {
    isDragging = true;

    const rect = element.getBoundingClientRect();
    const parentRect = imageBox.getBoundingClientRect();

    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;

    $(document).on("mousemove.editorDrag", (moveEvent) => {
      const newX = moveEvent.clientX - parentRect.left - dragOffsetX;
      const newY = moveEvent.clientY - parentRect.top - dragOffsetY;
      element.style.left = newX + "px";
      element.style.top = newY + "px";
    });

    $(document).on("mouseup.editorDrag", () => {
      isDragging = false;
      $(document).off(".editorDrag");
    });
  }

  // ---------------------------------------------------------------------
  // STYLE INPUTS
  // ---------------------------------------------------------------------
  styleWidth.on("input", () => {
    if (selectedElement) selectedElement.style.width = styleWidth.val() + "px";
  });

  styleHeight.on("input", () => {
    if (selectedElement)
      selectedElement.style.height = styleHeight.val() + "px";
  });

  styleColor.on("input", () => {
    if (selectedElement)
      selectedElement.style.backgroundColor = styleColor.val();
  });

  styleBorder.on("input", () => {
    if (selectedElement && selectedElement.classList.contains("dropzone")) {
      selectedElement.style.borderColor = styleBorder.val();
    }
  });

  styleThickness.on("input", () => {
    if (selectedElement && selectedElement.classList.contains("line")) {
      selectedElement.style.height = styleThickness.val() + "px";
    }
  });

  // ---------------------------------------------------------------------
  // DROPZONE NAME
  // ---------------------------------------------------------------------
  dropzoneName.on("input", () => {
    if (!selectedElement || !selectedElement.classList.contains("dropzone"))
      return;

    const newName = dropzoneName.val().trim();
    const oldName = selectedElement.dataset.zoneName;

    nameError.text("");
    dropzoneName.removeClass("error");

    if (newName && isDuplicateZoneName(newName, selectedElement)) {
      nameError.text("This ID already exists");
      dropzoneName.addClass("error");
      return;
    }

    selectedElement.dataset.zoneName = newName;

    if (oldName && dropzoneMap[oldName]) {
      const answerElem = dropzoneMap[oldName];
      answerElem.dataset.elementId = newName;
      dropzoneMap[newName] = answerElem;
      delete dropzoneMap[oldName];
    }
  });

  dropzoneValue.on("input", () => {
    if (!selectedElement || !selectedElement.classList.contains("dropzone"))
      return;

    const newValue = dropzoneValue.val().trim();
    selectedElement.dataset.zoneValue = newValue;

    if (dropzoneMap[selectedElement.dataset.zoneName]) {
      const answerElem = dropzoneMap[selectedElement.dataset.zoneName];
      answerElem.textContent = newValue;
    }

    if (selectedElement.dataset.zoneName && newValue) {
      if (!dropzoneMap[selectedElement.dataset.zoneName]) {
        createAnswerElement(selectedElement);
      }
    }
  });

  function isDuplicateZoneName(name, currentZone) {
    const zones = imageBox.querySelectorAll(".dropzone");
    for (let z of zones) {
      if (z !== currentZone && z.dataset.zoneName === name) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------
  // ANSWER ELEMENTS
  // ---------------------------------------------------------------------
  function createAnswerElement(dropzone) {
    const name = dropzone.dataset.zoneName;
    const value = dropzone.dataset.zoneValue;

    if (dropzoneMap[name]) return;

    const el = document.createElement("div");
    el.className = "answer-element";
    el.textContent = value;
    el.dataset.elementId = name;

    const count = Object.keys(dropzoneMap).length;
    el.style.left = 50 + count * 80 + "px";
    el.style.top = 50 + count * 30 + "px";

    answerBox.appendChild(el);
    dropzoneMap[name] = el;

    el.addEventListener("mousedown", (e) => {
      selectElement(dropzone);
      startAnswerDrag(e, el);
    });
  }

  function startAnswerDrag(e, element) {
    isDragging = true;

    const rect = element.getBoundingClientRect();
    const parentRect = answerBox.getBoundingClientRect();

    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;

    $(document).on("mousemove.answerDrag", (moveEvent) => {
      const newX = moveEvent.clientX - parentRect.left - dragOffsetX;
      const newY = moveEvent.clientY - parentRect.top - dragOffsetY;
      element.style.left = newX + "px";
      element.style.top = newY + "px";
    });

    $(document).on("mouseup.answerDrag", () => {
      isDragging = false;
      $(document).off(".answerDrag");
    });
  }

  // ---------------------------------------------------------------------
  // DELETE ELEMENT
  // ---------------------------------------------------------------------
  deleteBtn.on("click", () => {
    if (!selectedElement) return;

    const isDropzone = selectedElement.classList.contains("dropzone");
    const name = selectedElement.dataset.zoneName;

    if (isDropzone && dropzoneMap[name]) {
      dropzoneMap[name].remove();
      delete dropzoneMap[name];
    }

    selectedElement.remove();
    selectedElement = null;

    styleWidth.val("");
    styleHeight.val("");
    styleColor.val("#ffffff");
    styleBorder.val("#000000");
    styleThickness.val("");
    dropzoneName.val("");
    dropzoneValue.val("");
    nameError.text("");
    dropzoneName.removeClass("error");
    dropzoneFields.removeClass("show");
    valueFields.removeClass("show");
  });

  // ---------------------------------------------------------------------
  // RGB → HEX
  // ---------------------------------------------------------------------
  function rgbToHex(rgb) {
    if (!rgb || rgb === "rgba(0, 0, 0, 0)") return "#ffffff";
    const m = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return "#ffffff";
    const toHex = (x) => parseInt(x).toString(16).padStart(2, "0");
    return "#" + toHex(m[1]) + toHex(m[2]) + toHex(m[3]);
  }

  // ---------------------------------------------------------------------
  // EXPORT CANVAS
  // ---------------------------------------------------------------------
  const exportBtn = container.find("#exportBtn");
  const editorCSS = `https://demoadmin.fefdybraingym.com/public/css/editor.css`;
  //   const editorCSS = `https://demoadmin.fefdybraingym.com/public/css/editor.css?v=${Date.now()}`;

  function copyComputedStyles(src, dest) {
    const styles = getComputedStyle(src);
    const props = [
      "position",
      "top",
      "left",
      "right",
      "bottom",
      "width",
      "height",
      "min-width",
      "min-height",
      "max-width",
      "max-height",
      "display",
      "box-sizing",
      "transform",
      "z-index",
      "font-size",
      "font-weight",
      "font-family",
      "line-height",
      "letter-spacing",
      "padding",
      "margin",
      "color",
      "background-color",
    ];

    props.forEach((prop) => {
      dest.style[prop] = styles.getPropertyValue(prop);
    });
  }

  exportBtn.on("click", () => {
    const contentRow = document.querySelector("#editor_html");
    const clone = contentRow.cloneNode(true);

    const originalInputs = contentRow.querySelectorAll("input, textarea");
    const clonedInputs = clone.querySelectorAll("input, textarea");
    originalInputs.forEach((src, i) => {
      const val = src.value;
      clonedInputs[i].value = val;
      clonedInputs[i].setAttribute("value", val);
    });

    const originals = contentRow.querySelectorAll("*");
    const copies = clone.querySelectorAll("*");
    copyComputedStyles(contentRow, clone);
    originals.forEach((el, i) => copyComputedStyles(el, copies[i]));

    const img = clone.querySelector("img");
    if (img) img.src = assetURL + uploadedImageName;

    setTimeout(() => {
      const wrapper = document.createElement("div");
      wrapper.style.display = "flex";
      wrapper.style.gap = "18pc";

      const googleFonts = `
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alata&display=swap">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap">
    `;
      wrapper.insertAdjacentHTML("afterbegin", googleFonts);

      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = editorCSS;

      wrapper.appendChild(link);
      wrapper.appendChild(clone);

      const editor_html = wrapper.outerHTML;
      editor_html_val.val(editor_html);

      alert("Exported");
      console.log("HTML: ", editor_html);
      $("#questionCardContainer .form-submit-button").attr("disabled", false);
    }, 50);
  });
}

function IdentifyEditorTemplate(container) {
  let nextId = 1;
  let selectedId = null;
  let selectedIds = new Set(); // For multi-select
  const objects = new Map();

  const canvas = container.querySelector("#canvas-id");
  const addTextBtn = container.querySelector("#addTextBtn");
  const addImageBtn = container.querySelector("#addImageBtn");
  const imageFileInput = container.querySelector("#imageFileInput");
  const canvasBgColor = container.querySelector("#canvasBgColor");
  const propertiesPanel = container.querySelector("#propertiesPanel");
  const noSelection = container.querySelector("#noSelection");
  const questionText = container.querySelector("#editor_questionText-id");

  const propX = container.querySelector("#propX");
  const propY = container.querySelector("#propY");
  const propWidth = container.querySelector("#propWidth");
  const propHeight = container.querySelector("#propHeight");
  const propRotation = container.querySelector("#propRotation");
  const propFontSize = container.querySelector("#propFontSize");
  const propBgColor = container.querySelector("#propBgColor");
  const propTextColor = container.querySelector("#propTextColor");
  const propIsAnswer = container.querySelector("#propIsAnswer");

  const exportHtmlBtn = container.querySelector("#exportHtmlBtn");
  const setCanvasBgBtn = container.querySelector("#setCanvasBgBtn");
  const canvasBgFileInput = container.querySelector("#canvasBgFileInput");
  const clearBgBtn = container.querySelector("#clearBgBtn");
  const bringForwardBtn = container.querySelector("#bringForwardBtn");
  const sendBackBtn = container.querySelector("#sendBackBtn");
  const deleteBtn = container.querySelector("#deleteBtn");

  // New group buttons
  const groupBtn = document.createElement("div");
  groupBtn.id = "groupBtn";
  groupBtn.className = "action-link";
  groupBtn.textContent = "Group";
  groupBtn.style.display = "none";

  const ungroupBtn = document.createElement("div");
  ungroupBtn.id = "ungroupBtn";
  ungroupBtn.className = "action-link";
  ungroupBtn.textContent = "Ungroup";
  ungroupBtn.style.display = "none";

  const selectionInfo = document.createElement("div");
  selectionInfo.id = "selectionInfo";
  selectionInfo.style.marginBottom = "10px";
  selectionInfo.style.padding = "8px";
  selectionInfo.style.backgroundColor = "#f0f0f0";
  selectionInfo.style.borderRadius = "4px";
  selectionInfo.style.fontSize = "12px";
  selectionInfo.style.display = "none";

  propertiesPanel.parentNode.insertBefore(groupBtn, propertiesPanel);
  propertiesPanel.parentNode.insertBefore(ungroupBtn, propertiesPanel);
  propertiesPanel.parentNode.insertBefore(selectionInfo, propertiesPanel);

  function createId() {
    return "obj_" + nextId++;
  }

  function setSelected(id, multiSelect = false) {
    if (!multiSelect) {
      selectedIds.clear();
    }

    if (selectedIds.has(id)) {
      selectedIds.delete(id);
    } else {
      selectedIds.add(id);
    }

    if (selectedIds.size === 1) {
      selectedId = Array.from(selectedIds)[0];
    } else {
      selectedId = null;
    }

    updateSelectionStyles();
    updatePropertiesPanel();
  }

  function updateSelectionStyles() {
    const items = canvas.querySelectorAll(".canvas-item");
    items.forEach((item) => {
      if (selectedIds.has(item.dataset.id)) {
        item.classList.add("selected");
      } else {
        item.classList.remove("selected");
      }
    });
  }

  function showProperties(show) {
    propertiesPanel.style.display = show ? "block" : "none";
    noSelection.style.display = show ? "none" : "block";
  }

  function updateGroupButtons() {
    const isGroup = selectedId && objects.get(selectedId)?.type === "group";
    const hasMultiSelect = selectedIds.size > 1;

    groupBtn.style.display = hasMultiSelect && !isGroup ? "block" : "none";
    ungroupBtn.style.display = isGroup ? "block" : "none";
  }

  function updatePropertiesPanel() {
    updateGroupButtons();

    if (selectedIds.size !== 1 || !selectedId || !objects.has(selectedId)) {
      showProperties(false);
      return;
    }

    showProperties(true);
    const obj = objects.get(selectedId);
    propX.value = obj.x;
    propY.value = obj.y;
    propWidth.value = obj.width;
    propHeight.value = obj.height;
    propRotation.value = obj.rotation || 0;
    propFontSize.value = obj.fontSize || 24;
    propBgColor.value = obj.bgColor || "#ffffff";
    propTextColor.value = obj.textColor || "#000000";
    propIsAnswer.checked = !!obj.isAnswer;
  }

  function applyObjectStyles(id) {
    const obj = objects.get(id);
    const element = canvas.querySelector(`.canvas-item[data-id="${id}"]`);
    if (!element || !obj) return;

    element.style.left = obj.x + "px";
    element.style.top = obj.y + "px";
    element.style.width = obj.width + "px";
    element.style.height = obj.height + "px";
    element.style.transform = `rotate(${obj.rotation || 0}deg)`;

    if (obj.isAnswer) {
      element.dataset.answer = "true";
    } else {
      delete element.dataset.answer;
    }

    if (obj.type === "group") {
      element.style.backgroundColor = "transparent";
      return;
    }

    const content = element.querySelector(".content");
    if (obj.type === "text") {
      content.style.fontSize = (obj.fontSize || 24) + "px";
      content.style.color = obj.textColor || "#111827";
      element.style.backgroundColor = "transparent";
    } else if (obj.type === "rect" || obj.type === "circle") {
      element.style.backgroundColor = obj.bgColor || "#fbbf24";
      content.style.color = obj.textColor || "#111827";
    } else if (obj.type === "image") {
      element.style.backgroundColor = "transparent";
    }
  }

  function createCanvasItem(objData) {
    const item = document.createElement("div");
    item.className = "canvas-item";
    item.dataset.id = objData.id;
    item.style.position = "absolute";
    item.style.zIndex = "10";
    item.style.left = objData.x + "px";
    item.style.top = objData.y + "px";
    item.style.width = objData.width + "px";
    item.style.height = objData.height + "px";

    const content = document.createElement("div");
    content.className = "content";

    if (objData.type === "group") {
      content.style.position = "relative";
      content.style.width = "100%";
      content.style.height = "100%";
      // Children will be added later
    } else if (objData.type === "text") {
      content.classList.add("text");
      content.contentEditable = "true";
      content.innerText = objData.text || "Text";
      content.addEventListener("input", () => {
        const obj = objects.get(objData.id);
        if (obj) obj.text = content.innerText;
      });
    } else if (objData.type === "circle") {
      item.style.borderRadius = "999px";
    } else if (objData.type === "image") {
      const img = document.createElement("img");
      img.src = objData.src;
      content.appendChild(img);
    }

    item.appendChild(content);

    const handle = document.createElement("div");
    handle.className = "resize-handle";
    item.appendChild(handle);

    item.addEventListener("mousedown", (e) => {
      if (e.target === handle || e.target.classList.contains("resize-handle"))
        return;
      const isCtrlClick = e.ctrlKey || e.metaKey;
      setSelected(objData.id, isCtrlClick);
    });

    setupDrag(item, objData.id);
    setupResize(handle, objData.id);

    canvas.appendChild(item);
    applyObjectStyles(objData.id);
    return item;
  }

  function setupDrag(item, id) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    item.addEventListener("mousedown", (e) => {
      if (e.target.classList.contains("resize-handle")) return;
      if (e.button !== 0) return;
      isDragging = true;
      document.body.classList.add("dragging");
      startX = e.clientX;
      startY = e.clientY;
      const rect = item.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      startLeft = rect.left - canvasRect.left;
      startTop = rect.top - canvasRect.top;

      const onMove = (eMove) => {
        if (!isDragging) return;
        const dx = eMove.clientX - startX;
        const dy = eMove.clientY - startY;
        const newX = Math.max(0, startLeft + dx);
        const newY = Math.max(0, startTop + dy);

        item.style.left = newX + "px";
        item.style.top = newY + "px";

        const obj = objects.get(id);
        obj.x = newX;
        obj.y = newY;
        updatePropertiesPanel();
      };

      const onUp = () => {
        isDragging = false;
        document.body.classList.remove("dragging");
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  function setupResize(handle, id) {
    let isResizing = false;
    let startX, startY, startWidth, startHeight;

    handle.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      e.preventDefault();
      isResizing = true;
      document.body.classList.add("dragging");
      startX = e.clientX;
      startY = e.clientY;

      const item = canvas.querySelector(`.canvas-item[data-id="${id}"]`);
      const rect = item.getBoundingClientRect();
      startWidth = rect.width;
      startHeight = rect.height;

      const onMove = (eMove) => {
        if (!isResizing) return;
        const dx = eMove.clientX - startX;
        const dy = eMove.clientY - startY;

        const newWidth = Math.max(30, startWidth + dx);
        const newHeight = Math.max(30, startHeight + dy);

        item.style.width = newWidth + "px";
        item.style.height = newHeight + "px";

        const obj = objects.get(id);
        obj.width = newWidth;
        obj.height = newHeight;
        updatePropertiesPanel();
      };

      const onUp = () => {
        isResizing = false;
        document.body.classList.remove("dragging");
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  function addText() {
    const id = createId();
    const obj = {
      id,
      type: "text",
      x: 80,
      y: 80,
      width: 160,
      height: 60,
      rotation: 0,
      fontSize: 24,
      textColor: "#111827",
      bgColor: "#ffffff",
      text: "New text",
      isAnswer: false,
    };
    objects.set(id, obj);
    createCanvasItem(obj);
    setSelected(id);
  }

  function addRect() {
    const id = createId();
    const obj = {
      id,
      type: "rect",
      x: 120,
      y: 120,
      width: 150,
      height: 100,
      rotation: 0,
      bgColor: "#fbbf24",
      textColor: "#111827",
      isAnswer: false,
    };
    objects.set(id, obj);
    createCanvasItem(obj);
    setSelected(id);
  }

  function addCircle() {
    const id = createId();
    const obj = {
      id,
      type: "circle",
      x: 280,
      y: 160,
      width: 100,
      height: 100,
      rotation: 0,
      bgColor: "#60a5fa",
      textColor: "#111827",
      isAnswer: false,
    };
    objects.set(id, obj);
    createCanvasItem(obj);
    setSelected(id);
  }

  function addImageFromFile(src) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const id = createId();
      const obj = {
        id,
        type: "image",
        x: 200,
        y: 120,
        width: 200,
        height: 150,
        rotation: 0,
        src: src,
        isAnswer: false,
      };
      objects.set(id, obj);
      createCanvasItem(obj);
      setSelected(id);
    };
    reader.readAsDataURL(src);
  }

  function groupSelectedItems() {
    if (selectedIds.size < 2) return;

    const selectedItems = Array.from(selectedIds)
      .map((id) => objects.get(id))
      .sort((a, b) => a.x - b.x);

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    selectedItems.forEach((item) => {
      minX = Math.min(minX, item.x);
      minY = Math.min(minY, item.y);
      maxX = Math.max(maxX, item.x + item.width);
      maxY = Math.max(maxY, item.y + item.height);
    });

    const groupId = createId();
    const groupObj = {
      id: groupId,
      type: "group",
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      rotation: 0,
      children: Array.from(selectedIds),
      isAnswer: false,
    };

    selectedItems.forEach((item) => {
      item.relativeX = item.x - minX;
      item.relativeY = item.y - minY;
    });

    objects.set(groupId, groupObj);
    const groupElement = createCanvasItem(groupObj);
    const contentDiv = groupElement.querySelector(".content");

    function copyStyles(src, dest) {
      const computedStyle = getComputedStyle(src);
      const stylesToCopy = [
        "fontSize",
        "fontWeight",
        "color",
        "textAlign",
        "backgroundColor",
        "border",
        "borderRadius",
        "padding",
      ];
      stylesToCopy.forEach((style) => {
        dest.style[style] = computedStyle[style];
      });
    }

    selectedItems.forEach((item) => {
      const childElement = canvas.querySelector(
        `.canvas-item[data-id="${item.id}"]`
      );
      if (childElement) {
        const childDiv = document.createElement("div");
        childDiv.style.position = "absolute";
        childDiv.style.left = item.relativeX + "px";
        childDiv.style.top = item.relativeY + "px";
        childDiv.style.width = item.width + "px";
        childDiv.style.height = item.height + "px";
        childDiv.style.transform = `rotate(${item.rotation || 0}deg)`;

        const content = childElement.querySelector(".content");
        if (content) {
          const clonedContent = content.cloneNode(true);

          copyStyles(content, clonedContent);

          const img = clonedContent.querySelector("img");
          if (img) {
            clonedContent.style.display = "flex";
            clonedContent.style.alignItems = "center";
            clonedContent.style.justifyContent = "center";
            img.style.width = "100%";
            img.style.height = "100%";
            img.style.objectFit = "contain";
          }

          if (item.type === "text") {
            clonedContent.style.display = "flex";
            clonedContent.style.alignItems = "center";
            clonedContent.style.justifyContent = "center";
            clonedContent.contentEditable = "false";
          }

          childDiv.appendChild(clonedContent);
        }

        contentDiv.appendChild(childDiv);
        childElement.remove();
      }
    });

    selectedIds.clear();
    setSelected(groupId);
  }

  function ungroupSelectedItems() {
    if (!selectedId) return;
    const groupObj = objects.get(selectedId);
    if (groupObj.type !== "group") return;

    const groupElement = canvas.querySelector(
      `.canvas-item[data-id="${selectedId}"]`
    );

    // Restore children to canvas
    groupObj.children.forEach((childId) => {
      const childObj = objects.get(childId);

      // Restore absolute positioning
      childObj.x = groupObj.x + (childObj.relativeX || 0);
      childObj.y = groupObj.y + (childObj.relativeY || 0);
      delete childObj.relativeX;
      delete childObj.relativeY;

      // Create new canvas item for the child
      createCanvasItem(childObj);
    });

    // Remove group element
    groupElement.remove();
    objects.delete(selectedId);
    selectedIds.clear();
    selectedId = null;
    updatePropertiesPanel();
  }

  const assetURL = "http://localhost:5001/uploads/editor-img/";

  let uploadedImageName = "";

  // IMAGE UPLOAD
  addImageBtn.addEventListener("click", (e) => {
    e.preventDefault();
    imageFileInput.value = "";
    imageFileInput.click();
  });

  imageFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("editor_image", file);

    $.ajax({
      url: "/admin/image-upload",
      type: "POST",
      data: formData,
      processData: false,
      contentType: false,
      success: function (res) {
        console.log("Uploaded:", res.filename);
        uploadedImageName = res.filename;

        const finalImageUrl = assetURL + uploadedImageName;

        const id = createId();
        const obj = {
          id,
          type: "image",
          x: 200,
          y: 120,
          width: 200,
          height: 150,
          rotation: 0,
          src: finalImageUrl,
          isAnswer: false,
        };
        objects.set(id, obj);
        createCanvasItem(obj);
        setSelected(id);
      },
      error: function () {
        console.error("Upload failed");
      },
    });
  });

  // CANVAS BACKGROUND IMAGE UPLOAD
  setCanvasBgBtn.addEventListener("click", (e) => {
    e.preventDefault();
    canvasBgFileInput.value = "";
    canvasBgFileInput.click();
  });

  canvasBgFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("editor_image", file);

    $.ajax({
      url: "/admin/image-upload",
      type: "POST",
      data: formData,
      processData: false,
      contentType: false,
      success: function (res) {
        console.log("Canvas BG Uploaded:", res.filename);

        const finalImageUrl = assetURL + res.filename;

        canvas.style.backgroundImage = `url('${finalImageUrl}')`;
        canvas.style.backgroundSize = "cover";
        canvas.style.backgroundPosition = "center";
        canvas.style.backgroundRepeat = "no-repeat";
      },
      error: function () {
        console.error("Canvas BG Upload failed");
      },
    });
  });

  // Button Event Listeners
  addTextBtn.addEventListener("click", (e) => {
    e.preventDefault();
    addText();
  });

  groupBtn.addEventListener("click", (e) => {
    e.preventDefault();
    groupSelectedItems();
  });

  ungroupBtn.addEventListener("click", (e) => {
    e.preventDefault();
    ungroupSelectedItems();
  });

  canvasBgColor.addEventListener("input", () => {
    canvas.style.backgroundColor = canvasBgColor.value;
  });

  clearBgBtn.addEventListener("click", (e) => {
    e.preventDefault();
    canvas.style.backgroundImage = "none";
    canvas.style.backgroundColor = canvasBgColor.value;
  });

  canvas.addEventListener("mousedown", (e) => {
    if (e.target === canvas) {
      selectedIds.clear();
      selectedId = null;
      updateSelectionStyles();
      updatePropertiesPanel();
    }
  });

  function syncPropertyChange() {
    if (!selectedId || !objects.has(selectedId)) return;
    const obj = objects.get(selectedId);

    const x = parseFloat(propX.value);
    const y = parseFloat(propY.value);
    const w = parseFloat(propWidth.value);
    const h = parseFloat(propHeight.value);
    const rot = parseFloat(propRotation.value);
    const fontSize = parseFloat(propFontSize.value);

    if (!isNaN(x)) obj.x = x;
    if (!isNaN(y)) obj.y = y;
    if (!isNaN(w)) obj.width = Math.max(30, w);
    if (!isNaN(h)) obj.height = Math.max(30, h);
    if (!isNaN(rot)) obj.rotation = rot;
    if (!isNaN(fontSize)) obj.fontSize = fontSize;

    obj.bgColor = propBgColor.value;
    obj.textColor = propTextColor.value;
    obj.isAnswer = propIsAnswer.checked;

    objects.forEach((o, key) => applyObjectStyles(key));
    updatePropertiesPanel();
  }

  [
    propX,
    propY,
    propWidth,
    propHeight,
    propRotation,
    propFontSize,
    propBgColor,
    propTextColor,
  ].forEach((input) => {
    input.addEventListener("input", syncPropertyChange);
  });
  propIsAnswer.addEventListener("change", syncPropertyChange);

  const questionTextarea = container.querySelector(
    "textarea[name='array[0][question][text]']"
  );
  if (questionTextarea) {
    questionTextarea.addEventListener("input", (e) => {
      appendIdentifyEditorText(e.target.value);
    });
  }

  function exportHTML() {
    const canvasWrapper = document.querySelector(".canvas-wrapper-id");
    const clonedWrapper = canvasWrapper.cloneNode(true);

    clonedWrapper.querySelectorAll(".resize-handle").forEach((h) => h.remove());

    // Handle grouped items - clean up their structure
    clonedWrapper.querySelectorAll(".canvas-item").forEach((item) => {
      item.classList.remove("selected");
      const content = item.querySelector(":scope > .content");
      if (content) {
        content.contentEditable = "false";

        // If this is a group, clean up child divs
        const childDivs = content.querySelectorAll(":scope > div");
        childDivs.forEach((childDiv) => {
          // Remove the nested .content wrapper and move the actual content up
          const innerContent = childDiv.querySelector(".content");
          if (innerContent) {
            while (innerContent.firstChild) {
              childDiv.appendChild(innerContent.firstChild);
            }
            innerContent.remove();
          }
        });
      }
    });

    const clonedCanvas = clonedWrapper.querySelector("#canvas-id");

    const computedStyle = getComputedStyle(canvas);
    const canvasStyles = {
      width: computedStyle.width,
      height: computedStyle.height,
      backgroundColor: computedStyle.backgroundColor,
      backgroundImage: computedStyle.backgroundImage,
      backgroundSize: computedStyle.backgroundSize,
      backgroundPosition: computedStyle.backgroundPosition,
      backgroundRepeat: computedStyle.backgroundRepeat,
      borderRadius: computedStyle.borderRadius,
      boxShadow: computedStyle.boxShadow,
    };

    const questionInput = container.querySelector("#editor_questionText-id");
    const questionText = questionInput ? questionInput.value : "Question";

    const htmlString = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Canvas Export</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Jersey+25&display=swap');
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 40px;
        }

        .wrapper {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .canvas-wrapper-id {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            overflow: auto;
            padding: 40px;
            background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%);
        }

         .question-space-id {
            font-family: 'Jersey 25', sans-serif;
            padding: 16px 40px;
            background: transparent;
            font-size: 20px;
            font-weight: 400;
            letter-spacing: 0.5px;
            position: absolute;
            flex-shrink: 0;
            z-index: 2;
            bottom: 34pc;
          }

          input#editor_questionText-id {
            font-family: 'Jersey 25', sans-serif;
            border: none;
            font-size: 26px;
            background: #fff;
            color: #C60055;
            border-radius: 12px;
            text-align: center;
            padding:10px;
          }

        #canvas-id {
            width: ${canvasStyles.width};
            height: ${canvasStyles.height};
            background: ${canvasStyles.backgroundColor};
            ${canvasStyles.backgroundImage !== "none"
        ? `background-image: ${canvasStyles.backgroundImage};`
        : ""
      }
            background-size: ${canvasStyles.backgroundSize};
            background-position: ${canvasStyles.backgroundPosition};
            background-repeat: ${canvasStyles.backgroundRepeat};
            border-radius: ${canvasStyles.borderRadius};
            box-shadow: ${canvasStyles.boxShadow};
            position: relative;
            overflow: hidden;
        }

        .canvas-item {
            position: absolute !important;
            border-radius: 4px;
            box-shadow: none;
            z-index: 10 !important;
            cursor: pointer;
        }

        .canvas-item .content {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            padding: 4px;
            text-align: center;
            user-select: none;
        }

        .canvas-item .content.text {
            cursor: default;
            user-select: none;
        }

        .canvas-item .content img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
            pointer-events: none;
        }

        @import url('https://fonts.googleapis.com/css2?family=Alata&display=swap');
    </style>
</head>
<body>
    <div class="wrapper">
        ${clonedWrapper.outerHTML}
    </div>
</body>
</html>`;

    const hiddenInput = container.querySelector(
      "input[name='array[0][html][data]']"
    );
    if (hiddenInput) {
      hiddenInput.value = htmlString;
    }
  }

  exportHtmlBtn.addEventListener("click", (e) => {
    e.preventDefault();
    $("#questionCardContainer .form-submit-button").attr("disabled", false);
    exportHTML();
  });

  deleteBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (selectedIds.size === 0) return;

    selectedIds.forEach((id) => {
      const element = canvas.querySelector(`.canvas-item[data-id="${id}"]`);
      if (element) element.remove();
      objects.delete(id);
    });

    selectedIds.clear();
    selectedId = null;
    updateSelectionStyles();
    updatePropertiesPanel();
  });

  bringForwardBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (!selectedId) return;
    const element = canvas.querySelector(
      `.canvas-item[data-id="${selectedId}"]`
    );
    if (element && element.nextElementSibling) {
      element.parentNode.insertBefore(element.nextElementSibling, element);
    }
  });

  sendBackBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (!selectedId) return;
    const element = canvas.querySelector(
      `.canvas-item[data-id="${selectedId}"]`
    );
    if (element && element.previousElementSibling) {
      element.parentNode.insertBefore(element, element.previousElementSibling);
    }
  });

  canvas.style.backgroundColor = canvasBgColor.value;
}

function appendEditorText(text) {
  const questionText = $("#editor_questionText");
  if (questionText) {
    questionText.val(text);
  }
}

function appendIdentifyEditorText(text) {
  const questionInput = document.querySelector("#editor_questionText-id");
  if (questionInput) {
    questionInput.value = text;
    questionInput.setAttribute("value", text);
  }
}

function appendDragDropText(text) {
  const questionInput = document.querySelector("#dd-editor_questionText-id");
  if (questionInput) {
    questionInput.value = text;
    questionInput.setAttribute("value", text);
  }
}
function dragAndDropEditorTemplate(container) {
  const canvas = document.getElementById("editor-canvas");
  const propertiesPanel = document.getElementById("properties-panel");
  const propertyFields = document.getElementById("property-fields");

  let selectedElement = null;
  let elements = [];
  let bgImage = "";
  let bgImageUrl = "";
  let isDragging = false;
  let isResizing = false;
  let dragStartPos = { x: 0, y: 0 };
  let elementStartPos = { x: 0, y: 0 };
  let answerSpotMode = false;

  const assetURL = "http://localhost:5001/uploads/editor-img/";

  function getCanvasCoords(clientX, clientY) {
    const canvasRect = canvas.getBoundingClientRect();
    return {
      x: clientX - canvasRect.left,
      y: clientY - canvasRect.top,
    };
  }

  document.getElementById("bg-upload").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("editor_image", file);

    $.ajax({
      url: "/admin/image-upload",
      type: "POST",
      data: formData,
      processData: false,
      contentType: false,
      success: function (res) {
        console.log("BG Uploaded:", res.filename);
        bgImageUrl = assetURL + res.filename;
        canvas.style.backgroundImage = `url('${bgImageUrl}')`;
        canvas.style.backgroundSize = "cover";
        canvas.style.backgroundPosition = "center";
        e.target.value = "";
      },
      error: function () {
        console.error("BG Upload failed");
      },
    });
  });

  document.getElementById("dropzone-upload").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const groupCount = elements.filter((el) => el.type === "dropzone").length;
    if (groupCount >= 2) {
      alert("Only 2 drop zones allowed (Group A & B)");
      e.target.value = "";
      return;
    }

    const group = groupCount === 0 ? "A" : "B";

    // Upload file and get URL
    const formData = new FormData();
    formData.append("editor_image", file);

    $.ajax({
      url: "/admin/image-upload",
      type: "POST",
      data: formData,
      processData: false,
      contentType: false,
      success: function (res) {
        console.log("Dropzone Uploaded:", res.filename);
        const imageUrl = assetURL + res.filename;
        addElement("dropzone", imageUrl, group);
        e.target.value = "";
      },
      error: function () {
        console.error("Dropzone Upload failed");
      },
    });
  });

  document.getElementById("item-upload").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Upload file and get URL
    const formData = new FormData();
    formData.append("editor_image", file);

    $.ajax({
      url: "/admin/image-upload",
      type: "POST",
      data: formData,
      processData: false,
      contentType: false,
      success: function (res) {
        console.log("Item Uploaded:", res.filename);
        const imageUrl = assetURL + res.filename;
        addElement("item", imageUrl, "A");
        e.target.value = "";
      },
      error: function () {
        console.error("Item Upload failed");
      },
    });
  });

  function addElement(type, imgSrc, group) {
    const id = "el-" + Date.now();
    let title = "";
    if (type === "dropzone") {
      title =
        prompt(`Enter title for Drop Zone ${group}:`) || `Drop Zone ${group}`;
    }
    let itemName = "";
    if (type === "item") {
      itemName =
        prompt("Enter name for this item:") ||
        "Item " + (elements.filter((e) => e.type === "item").length + 1);
    }

    const el = {
      id,
      type,
      imgSrc,
      group,
      x: 50,
      y: 50,
      width: 150,
      height: 150,
      answerSpot: null,
      title: title,
      titleX: type === "dropzone" ? 50 : 0,
      titleY: type === "dropzone" ? 200 : 0,
      titleFontSize: type === "dropzone" ? 24 : 0,
      itemName: itemName,
    };

    elements.push(el);
    renderElement(el);
  }

  function renderElement(el) {
    const existing = document.getElementById(el.id);
    if (existing) {
      existing.remove();
    }

    const div = document.createElement("div");
    div.className = "gge-canvas-item";
    div.id = el.id;
    div.style.left = el.x + "px";
    div.style.top = el.y + "px";
    div.style.width = el.width + "px";
    div.style.height = el.height + "px";

    const img = document.createElement("img");
    img.src = el.imgSrc; // Uses server URL
    img.draggable = false;
    div.appendChild(img);

    const label = document.createElement("div");
    label.className = "gge-item-label";
    label.textContent =
      el.type === "dropzone"
        ? `Drop Zone ${el.group}`
        : `Item (Group ${el.group})`;
    div.appendChild(label);

    const handle = document.createElement("div");
    handle.className = "gge-resize-grip";
    div.appendChild(handle);

    if (el.type === "dropzone" && el.title) {
      const existingTitle = document.getElementById(el.id + "-title");
      if (existingTitle) {
        existingTitle.remove();
      }

      const titleDiv = document.createElement("div");
      titleDiv.className = "gge-zone-title";
      titleDiv.id = el.id + "-title";
      titleDiv.textContent = el.title;
      titleDiv.style.left = el.titleX + "px";
      titleDiv.style.top = el.titleY + "px";
      titleDiv.style.fontSize = (el.titleFontSize || 24) + "px";

      const titleResizeHandle = document.createElement("div");
      titleResizeHandle.className = "gge-title-resize-grip";
      titleDiv.appendChild(titleResizeHandle);

      titleDiv.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();

        selectElement(el);

        if (e.target.className === "gge-title-resize-grip") {
          isResizing = true;
          isDragging = false;

          const coords = getCanvasCoords(e.clientX, e.clientY);
          elementStartPos.fontSize = el.titleFontSize || 24;
          dragStartPos.x = coords.x;
          dragStartPos.y = coords.y;
          dragStartPos.isTitleResize = true;
        } else {
          isDragging = true;
          isResizing = false;

          const coords = getCanvasCoords(e.clientX, e.clientY);
          elementStartPos.x = el.titleX;
          elementStartPos.y = el.titleY;
          dragStartPos.x = coords.x;
          dragStartPos.y = coords.y;
          dragStartPos.isTitle = true;
        }
      });

      canvas.appendChild(titleDiv);
    }

    div.addEventListener("mousedown", (e) => {
      e.preventDefault();

      if (e.target.className === "gge-resize-grip") {
        isResizing = true;
        isDragging = false;
        selectedElement = el;
        selectElement(el);

        const coords = getCanvasCoords(e.clientX, e.clientY);
        elementStartPos.x = el.width;
        elementStartPos.y = el.height;
        dragStartPos.x = coords.x;
        dragStartPos.y = coords.y;

        e.stopPropagation();
        return;
      }

      selectElement(el);
      isDragging = true;
      isResizing = false;

      const coords = getCanvasCoords(e.clientX, e.clientY);
      elementStartPos.x = el.x;
      elementStartPos.y = el.y;
      dragStartPos.x = coords.x;
      dragStartPos.y = coords.y;
    });

    canvas.appendChild(div);

    if (selectedElement && selectedElement.id === el.id) {
      div.classList.add("gge-selected");
    }

    if (el.type === "item" && el.answerSpot) {
      div.classList.add("gge-has-answer");
    }
  }

  function selectElement(el) {
    document
      .querySelectorAll(".gge-canvas-item")
      .forEach((e) => e.classList.remove("gge-selected"));
    document
      .querySelectorAll(".gge-zone-title")
      .forEach((t) => t.classList.remove("gge-selected"));

    document.getElementById(el.id).classList.add("gge-selected");

    const titleDiv = document.getElementById(el.id + "-title");
    if (titleDiv) {
      titleDiv.classList.add("gge-selected");
    }

    selectedElement = el;
    showProperties(el);
  }

  function showProperties(el) {
    const propertyFields = document.getElementById("property-fields");

    let answerSpotHTML = "";
    if (el.type === "item") {
      if (el.answerSpot) {
        answerSpotHTML = `
        <label class="gge-props-label">Answer Spot Set ✓</label>
        <div style="background: #1a1f2e; padding: 8px 12px; border-radius: 6px; margin-bottom: 16px; font-size: 12px; color: #10b981;">
            X: ${Math.round(el.answerSpot.x)}, Y: ${Math.round(el.answerSpot.y)}
        </div>
        <div class="gge-btn-base gge-btn-primary gge-btn-compact" id="update-answer-spot" style="width: 100%; margin-bottom: 8px;">Update Answer Spot</div>
        <div class="gge-btn-base gge-btn-danger gge-btn-compact" id="clear-answer-spot" style="width: 100%; margin-bottom: 16px;">Clear Answer Spot</div>
    `;
      } else {
        answerSpotHTML = `
        <div class="gge-btn-base gge-btn-primary gge-btn-compact" id="set-answer-spot" style="width: 100%; margin-bottom: 16px;">Set Answer Spot</div>
    `;
      }
    }

    propertyFields.innerHTML = `
<label class="gge-props-label">Type</label>
<input type="text" class="gge-props-text" value="${el.type === "dropzone" ? "Drop Zone" : "Draggable Item"
      }" disabled>
${el.type === "item"
        ? `
<label class="gge-props-label">Item Name</label>
<input type="text" id="prop-item-name" class="gge-props-text" value="${el.itemName || ""
        }" style="font-weight: 600;">
`
        : ""
      }
<label class="gge-props-label">Group</label>
${el.type === "dropzone"
        ? `
<label class="gge-props-label">Title Text</label>
<input type="text" id="prop-title" class="gge-props-text" value="${el.title || ""
        }" style="font-weight: 600;">

<label class="gge-props-label">Title X Position</label>
<input type="number" id="prop-title-x" class="gge-props-number" value="${Math.round(
          el.titleX
        )}">

<label class="gge-props-label">Title Y Position</label>
<input type="number" id="prop-title-y" class="gge-props-number" value="${Math.round(
          el.titleY
        )}">
`
        : ""
      }
<label class="gge-props-label">Title Font Size</label>
<input type="number" id="prop-title-fontsize" class="gge-props-number" value="${Math.round(
        el.titleFontSize || 24
      )}" min="12" max="72">
<select id="prop-group" class="gge-props-select">
  <option value="A" ${el.group === "A" ? "selected" : ""}>Group A</option>
  <option value="B" ${el.group === "B" ? "selected" : ""}>Group B</option>
</select>

${answerSpotHTML}

<label class="gge-props-label">X Position</label>
<input type="number" id="prop-x" class="gge-props-number" value="${Math.round(
        el.x
      )}">

<label class="gge-props-label">Y Position</label>
<input type="number" id="prop-y" class="gge-props-number" value="${Math.round(
        el.y
      )}">

<label class="gge-props-label">Width</label>
<input type="number" id="prop-width" class="gge-props-number" value="${Math.round(
        el.width
      )}">

<label class="gge-props-label">Height</label>
<input type="number" id="prop-height" class="gge-props-number" value="${Math.round(
        el.height
      )}">
`;

    if (el.type === "item") {
      document
        .getElementById("prop-item-name")
        .addEventListener("input", (e) => {
          el.itemName = e.target.value;
        });
    }

    if (el.type === "dropzone") {
      document.getElementById("prop-title").addEventListener("input", (e) => {
        el.title = e.target.value;
        const titleDiv = document.getElementById(el.id + "-title");
        if (titleDiv) {
          titleDiv.textContent = el.title;
        }
      });

      document.getElementById("prop-title-x").addEventListener("input", (e) => {
        el.titleX = parseInt(e.target.value) || 0;
        const titleDiv = document.getElementById(el.id + "-title");
        if (titleDiv) {
          titleDiv.style.left = el.titleX + "px";
        }
      });

      document.getElementById("prop-title-y").addEventListener("input", (e) => {
        el.titleY = parseInt(e.target.value) || 0;
        const titleDiv = document.getElementById(el.id + "-title");
        if (titleDiv) {
          titleDiv.style.top = el.titleY + "px";
        }
      });

      document
        .getElementById("prop-title-fontsize")
        .addEventListener("input", (e) => {
          el.titleFontSize = parseInt(e.target.value) || 24;
          const titleDiv = document.getElementById(el.id + "-title");
          if (titleDiv) {
            titleDiv.style.fontSize = el.titleFontSize + "px";
          }
        });
    }
    document.getElementById("prop-group").addEventListener("change", (e) => {
      el.group = e.target.value;
      renderElement(el); 
    });
    ["x", "y", "width", "height"].forEach((prop) => {
      document.getElementById(`prop-${prop}`).addEventListener("input", (e) => {
        const value = parseInt(e.target.value) || 0;
        el[prop] = value;
        updateElementPosition(el);
      });
    });

    if (el.type === "item") {
      const setBtn = document.getElementById("set-answer-spot");
      const updateBtn = document.getElementById("update-answer-spot");
      const clearBtn = document.getElementById("clear-answer-spot");

      if (setBtn) {
        setBtn.onclick = () => {
          enterAnswerSpotMode(el);
        };
      }
      if (updateBtn) {
        updateBtn.onclick = () => {
          enterAnswerSpotMode(el);
        };
      }
      if (clearBtn) {
        clearBtn.onclick = () => {
          el.answerSpot = null;
          renderElement(el);
          showProperties(el);
        };
      }
    }
  }
  function updateElementPosition(el) {
    const div = document.getElementById(el.id);
    div.style.left = el.x + "px";
    div.style.top = el.y + "px";
    div.style.width = el.width + "px";
    div.style.height = el.height + "px";
  }

  // Mouse move for dragging and resizing
  document.addEventListener("mousemove", (e) => {
    if (answerSpotMode && selectedElement && isDragging) {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      const deltaX = coords.x - dragStartPos.x;
      const deltaY = coords.y - dragStartPos.y;

      selectedElement.x = Math.max(
        0,
        Math.min(1024 - selectedElement.width, elementStartPos.x + deltaX)
      );
      selectedElement.y = Math.max(
        0,
        Math.min(576 - selectedElement.height, elementStartPos.y + deltaY)
      );

      updateElementPosition(selectedElement);
      return;
    }

    if (!selectedElement || (!isDragging && !isResizing)) return;

    const coords = getCanvasCoords(e.clientX, e.clientY);
    if (isResizing && dragStartPos.isTitleResize) {
      const deltaX = coords.x - dragStartPos.x;

      selectedElement.titleFontSize = Math.max(
        12,
        Math.min(72, elementStartPos.fontSize + deltaX / 2)
      );

      const titleDiv = document.getElementById(selectedElement.id + "-title");
      if (titleDiv) {
        titleDiv.style.fontSize = selectedElement.titleFontSize + "px";
      }
      const fontSizeInput = document.getElementById("prop-title-fontsize");
      if (fontSizeInput) {
        fontSizeInput.value = Math.round(selectedElement.titleFontSize);
      }
      return;
    }
    if (isDragging && dragStartPos.isTitle) {
      const deltaX = coords.x - dragStartPos.x;
      const deltaY = coords.y - dragStartPos.y;

      selectedElement.titleX = elementStartPos.x + deltaX;
      selectedElement.titleY = elementStartPos.y + deltaY;

      const titleDiv = document.getElementById(selectedElement.id + "-title");
      if (titleDiv) {
        titleDiv.style.left = selectedElement.titleX + "px";
        titleDiv.style.top = selectedElement.titleY + "px";
      }
      return;
    }
    if (isResizing) {
      const deltaX = coords.x - dragStartPos.x;
      const deltaY = coords.y - dragStartPos.y;

      selectedElement.width = Math.max(50, elementStartPos.x + deltaX);
      selectedElement.height = Math.max(50, elementStartPos.y + deltaY);

      updateElementPosition(selectedElement);

      document.getElementById("prop-width").value = Math.round(
        selectedElement.width
      );
      document.getElementById("prop-height").value = Math.round(
        selectedElement.height
      );
    } else if (isDragging) {
      const deltaX = coords.x - dragStartPos.x;
      const deltaY = coords.y - dragStartPos.y;

      selectedElement.x = Math.max(
        0,
        Math.min(1024 - selectedElement.width, elementStartPos.x + deltaX)
      );
      selectedElement.y = Math.max(
        0,
        Math.min(576 - selectedElement.height, elementStartPos.y + deltaY)
      );

      updateElementPosition(selectedElement);

      document.getElementById("prop-x").value = Math.round(selectedElement.x);
      document.getElementById("prop-y").value = Math.round(selectedElement.y);
    }
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
    if (dragStartPos.isTitle) {
      dragStartPos.isTitle = false;
    }
    if (dragStartPos.isTitleResize) {
      dragStartPos.isTitleResize = false;
    }
    isResizing = false;
  });

  // Delete selected element
  document.getElementById("delete-btn").addEventListener("click", () => {
    if (!selectedElement) {
      alert("No element selected");
      return;
    }

    if (selectedElement.type === "dropzone") {
      const titleDiv = document.getElementById(selectedElement.id + "-title");
      if (titleDiv) {
        titleDiv.remove();
      }
    }

    const elementDiv = document.getElementById(selectedElement.id);
    if (elementDiv) {
      elementDiv.remove();
    }

    elements = elements.filter((el) => el.id !== selectedElement.id);
    selectedElement = null;
    document.getElementById("property-fields").innerHTML =
      '<div style="color: #94a3b8; font-size: 13px;">Select an element to view properties</div>';
  });

  // Export HTML
  document.getElementById("export-btn").addEventListener("click", () => {
    const dropzones = elements.filter((el) => el.type === "dropzone");
    const items = elements.filter((el) => el.type === "item");

    if (dropzones.length !== 2) {
      alert("Please add exactly 2 drop zones (Group A & B)");
      return;
    }

    if (items.length === 0) {
      alert("Please add at least one draggable item");
      return;
    }

    const divHTML = generateDivHTML();
    $("#dragdrop_editor_html_val").val(divHTML);
    $("#questionCardContainer .form-submit-button").attr("disabled", false);
    console.log(divHTML);
    alert("Div HTML logged to console. Press F12 to view.");
  });

  // Answer Spot Mode Functions
  function enterAnswerSpotMode(el) {
    answerSpotMode = true;
    const overlay = document.getElementById("answer-spot-overlay");
    overlay.classList.add("gge-active");

    const originalPos = {
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
    };

    if (el.answerSpot) {
      el.x = el.answerSpot.x;
      el.y = el.answerSpot.y;
      el.width = el.answerSpot.width;
      el.height = el.answerSpot.height;
      updateElementPosition(el);
      showProperties(el);
    }

    const div = document.getElementById(el.id);
    div.classList.add("gge-answer-mode");

    const lockBtn = document.getElementById("answer-spot-lock");
    const doneBtn = document.getElementById("answer-spot-done");
    const cancelBtn = document.getElementById("answer-spot-cancel");
    const message = document.getElementById("answer-spot-message");

    lockBtn.style.display = "block";
    doneBtn.style.display = "none";
    message.textContent =
      "Drag and resize the item, then click Lock when ready";

    let lockedPosition = null;

    lockBtn.onclick = () => {
      lockedPosition = {
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
      };

      lockBtn.style.display = "none";
      doneBtn.style.display = "block";
      message.textContent =
        "Position locked! Click Done to save or Cancel to adjust";

      div.style.borderStyle = "solid";
      div.style.borderColor = "#10b981";
    };

    doneBtn.onclick = () => {
      if (lockedPosition) {
        el.answerSpot = {
          x: lockedPosition.x,
          y: lockedPosition.y,
          width: lockedPosition.width,
          height: lockedPosition.height,
        };

        el.x = originalPos.x;
        el.y = originalPos.y;
        el.width = originalPos.width;
        el.height = originalPos.height;
        updateElementPosition(el);

        exitAnswerSpotMode(el);
        renderElement(el);
        showProperties(el);
      }
    };

    cancelBtn.onclick = () => {
      el.x = originalPos.x;
      el.y = originalPos.y;
      el.width = originalPos.width;
      el.height = originalPos.height;
      updateElementPosition(el);
      showProperties(el);
      exitAnswerSpotMode(el);
    };
  }

  function exitAnswerSpotMode(el) {
    answerSpotMode = false;
    isDragging = false;
    isResizing = false;

    const overlay = document.getElementById("answer-spot-overlay");
    overlay.classList.remove("gge-active");

    const div = document.getElementById(el.id);
    div.classList.remove("gge-answer-mode");
    div.style.borderStyle = "";
    div.style.borderColor = "";
  }

  function generateDivHTML() {
    const dropzones = elements.filter((el) => el.type === "dropzone");
    const items = elements.filter((el) => el.type === "item");

    let dropzoneHTML = "";
    dropzones.forEach((dz, index) => {
      const titleHTML = dz.title
        ? `
    <div class="dropzone-title" style="position: absolute; left: ${dz.titleX}px; top: ${dz.titleY}px; font-size: ${dz.titleFontSize}px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 10px 10px; border-radius: 50px; font-weight: 900; box-shadow: 0 8px 0 #d63d52, 0 10px 25px rgba(245, 87, 108, 0.4); border: 5px solid #fff; z-index: 100; font-family: 'Comic Sans MS', 'Chalkboard SE', cursive; text-transform: uppercase; letter-spacing: 2px; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);">${dz.title}</div>`
        : "";

      dropzoneHTML += `
    <div class="dropzone" data-group="${dz.group}" data-title="${dz.title || ""
        }" style="position: absolute; left: ${dz.x}px; top: ${dz.y}px; width: ${dz.width
        }px; height: ${dz.height}px; border: 2px solid transparent;">
        <img src="${dz.imgSrc}" alt="Drop Zone ${dz.group
        }" style="width: 100%; height: 100%; pointer-events: none; user-select: none;">
    </div>${titleHTML}`;
    });

    let itemsHTML = "";
    items.forEach((item, index) => {
      const answerAttrs = item.answerSpot
        ? `data-answer-x="${item.answerSpot.x}" data-answer-y="${item.answerSpot.y}" data-answer-width="${item.answerSpot.width}" data-answer-height="${item.answerSpot.height}"`
        : "";

      itemsHTML += `
<div class="item" data-group="${item.group}" data-name="${item.itemName || "Item " + (index + 1)
        }" ${answerAttrs} style="position: absolute; left: ${item.x}px; top: ${item.y
        }px; width: ${item.width}px; height: ${item.height
        }px; cursor: move; user-select: none; z-index: 10;">
    <img src="${item.imgSrc}" alt="${item.itemName || "Item"
        }" style="width: 100%; height: 100%; pointer-events: none; user-select: none; -webkit-user-drag: none;">
</div>`;
    });

    return `<div class="game-container" style="position: relative; width: 1024px; height: 576px; background: #252d3d; ${bgImageUrl ? `background-image: url('${bgImageUrl}');` : ""
      } background-size: cover; background-position: center; border: 1px solid #2d3748; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4); border-radius: 4px;">
${dropzoneHTML}
${itemsHTML}
</div>`;
  }
}

function makeHTMLforDragDrop3(id, type, data){
  // console.log("data", data)
  let html = `<div class="card question-card mt-3">
    <div class="card-body">
      <div class="container">
        <div class="row">
          <div class="col-sm-12">
            <div class="row">
              <div class="col-sm-12">
                <div class="form-group">
                  <label>Question</label>
                  <textarea name="array[0][question][text]" onkeyup="appendDragDropText(this.value)" class="form-control" rows="1">${data[0].question.text}</textarea>
                  <input type="hidden" name="array[0][html][data]" id="dragdrop_editor_html_val">
                </div>
                <div class="row">
    <div class="gge-editor-root">
        <div class="gge-workspace-layout">
            <div class="gge-left-panel">
                <div class="gge-panel-section">
                    <h3>Tools</h3>

                    <label class="gge-tool-btn">
                        Set Background
                        <input type="file" id="bg-upload" accept="image/*">
                    </label>

                    <label class="gge-tool-btn">
                        Add Drop Zone
                        <input type="file" id="dropzone-upload" accept="image/*">
                    </label>

                    <label class="gge-tool-btn">
                        Add Item
                        <input type="file" id="item-upload" accept="image/*">
                    </label>

                    <a class="gge-tool-btn" id="delete-btn" style="background: #991b1b; border-color: #991b1b;">
                        Delete Selected
                    </a>

                    <a class="gge-btn-base gge-btn-success" id="export-btn">Export HTML</a>
                </div>
            </div>

            <div class="gge-canvas-area">
              <div class="dd-question-space-id">
                                    <input type="text" id="dd-editor_questionText-id" placeholder="Enter your question here..." readonly/>
                                </div>
                <div class="gge-canvas" id="editor-canvas">
                    <div class="gge-overlay-modal" id="answer-spot-overlay">
                        <div class="gge-modal-content">
                            <h3 style="margin-bottom: 12px; font-size: 16px;">Set Answer Spot</h3>
                            <p style="margin-bottom: 0; font-size: 13px;" id="answer-spot-message">Drag and resize the
                                item, then click Lock when ready</p>
                        </div>
                        <div class="gge-modal-controls">
                            <a class="gge-btn-base gge-btn-primary" id="answer-spot-lock" style="display: block;">Lock
                                Position</a>
                            <a class="gge-btn-base gge-btn-success" id="answer-spot-done"
                                style="display: none;">Done</a>
                            <a class="gge-btn-base gge-btn-danger" id="answer-spot-cancel">Cancel</a>
                        </div>
                    </div>
                </div>
            </div>

            <div class="gge-right-panel">
                <div id="properties-panel" class="gge-props-panel">
                    <h3>Properties</h3>
                    <div id="property-fields" style="color: #94a3b8; font-size: 13px;">
                        Select an element to view properties
                    </div>
                </div>
            </div>
        </div>
    </div>
                    <!-- content end -->
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`;

  html += `<input type="hidden" name="id" value="${id}">`;
  html += `<input type="hidden" name="question_type" value="${type}">`;

  return html;
}

  function renderScriptForDrafDrop3(container, old_data) {
            const canvas = document.getElementById("editor-canvas");
            const propertiesPanel = document.getElementById("properties-panel");
            const propertyFields = document.getElementById("property-fields");

            // console.log("canvas", canvas)

            let selectedElement = null;
            let elements = [];
            let bgImage = "";
            let bgImageUrl = "";
            let isDragging = false;
            let isResizing = false;
            let dragStartPos = { x: 0, y: 0 };
            let elementStartPos = { x: 0, y: 0 };
            let answerSpotMode = false;

            const assetURL = "http://localhost:5001/uploads/editor-img/";

            function getCanvasCoords(clientX, clientY) {
                const canvasRect = canvas.getBoundingClientRect();
                return {
                    x: clientX - canvasRect.left,
                    y: clientY - canvasRect.top,
                };
            }

            //  LOAD FROM JSON
            function loadFromJSON(jsonData) {
                if (jsonData.question && jsonData.question.text) {
                    document.getElementById("dd-editor_questionText-id").value = jsonData.question.text;
                }

                if (!jsonData.html || !jsonData.html.data) return;

                const parser = new DOMParser();
                const doc = parser.parseFromString(jsonData.html.data, "text/html");
                const gameContainer = doc.querySelector(".game-container");
                if (!gameContainer) return;

                // Background
                const bgMatch = gameContainer.style.backgroundImage.match(/url\(['"]?(.+?)['"]?\)/);
                if (bgMatch) {
                    bgImageUrl = bgMatch[1];
                    canvas.style.backgroundImage = `url('${bgImageUrl}')`;
                    canvas.style.backgroundSize = "cover";
                    canvas.style.backgroundPosition = "center";
                }

                // Dropzones
                const dropzoneEls = doc.querySelectorAll(".dropzone");
                dropzoneEls.forEach((dz) => {
                    const group = dz.getAttribute("data-group");
                    const title = dz.getAttribute("data-title") || "";
                    const style = dz.style;

                    const x = parseInt(style.left) || 0;
                    const y = parseInt(style.top) || 0;
                    const width = parseInt(style.width) || 150;
                    const height = parseInt(style.height) || 150;

                    const imgSrc = dz.querySelector("img") ? dz.querySelector("img").src : "";

                    let titleX = x;
                    let titleY = y + height + 10;
                    let titleFontSize = 24;

                    const allTitles = doc.querySelectorAll(".dropzone-title");
                    allTitles.forEach((dt) => {
                        if (dt.textContent.trim() === title) {
                            titleX = parseInt(dt.style.left) || titleX;
                            titleY = parseInt(dt.style.top) || titleY;
                            titleFontSize = parseFloat(dt.style.fontSize) || 24;
                        }
                    });

                    const el = {
                        id: "el-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
                        type: "dropzone",
                        imgSrc,
                        group,
                        x,
                        y,
                        width,
                        height,
                        answerSpot: null,
                        title,
                        titleX,
                        titleY,
                        titleFontSize,
                        itemName: "",
                    };

                    elements.push(el);
                    renderElement(el);
                });

                const itemEls = doc.querySelectorAll(".item");
                itemEls.forEach((item) => {
                    const group = item.getAttribute("data-group");
                    const itemName = item.getAttribute("data-name") || "";
                    const style = item.style;

                    const x = parseInt(style.left) || 0;
                    const y = parseInt(style.top) || 0;
                    const width = parseInt(style.width) || 100;
                    const height = parseInt(style.height) || 100;

                    const imgSrc = item.querySelector("img") ? item.querySelector("img").src : "";

                    const answerX = item.getAttribute("data-answer-x");
                    const answerY = item.getAttribute("data-answer-y");
                    const answerW = item.getAttribute("data-answer-width");
                    const answerH = item.getAttribute("data-answer-height");

                    const answerSpot = (answerX !== null)
                        ? { x: parseFloat(answerX), y: parseFloat(answerY), width: parseFloat(answerW), height: parseFloat(answerH) }
                        : null;

                    const el = {
                        id: "el-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
                        type: "item",
                        imgSrc,
                        group,
                        x,
                        y,
                        width,
                        height,
                        answerSpot,
                        title: "",
                        titleX: 0,
                        titleY: 0,
                        titleFontSize: 0,
                        itemName,
                    };

                    elements.push(el);
                    renderElement(el);
                });
            }
            // const preloadData = {
            //     "html": {
            //         "data": "<div class=\"game-container\" style=\"position: relative; width: 1024px; height: 576px; background: #252d3d; background-image: url('https://demoadmin.fefdybraingym.com/public/uploads/editor-img/1773738964859-682977958.jpg'); background-size: cover; background-position: center; border: 1px solid #2d3748; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4); border-radius: 4px;\">\r\n\r\n    <div class=\"dropzone\" data-group=\"A\" data-title=\"Healthy Foods\" style=\"position: absolute; left: 0px; top: 223px; width: 360px; height: 353px; border: 2px solid transparent;\">\r\n        <img src=\"https://demoadmin.fefdybraingym.com/public/uploads/editor-img/1773739019700-528114010.png\" alt=\"Drop Zone A\" style=\"width: 100%; height: 100%; pointer-events: none; user-select: none;\">\r\n    </div>\r\n    <div class=\"dropzone-title\" style=\"position: absolute; left: 106px; top: 522px; font-size: 12px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 10px 10px; border-radius: 50px; font-weight: 900; box-shadow: 0 8px 0 #d63d52, 0 10px 25px rgba(245, 87, 108, 0.4); border: 5px solid #fff; z-index: 100; font-family: 'Comic Sans MS', 'Chalkboard SE', cursive; text-transform: uppercase; letter-spacing: 2px; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);\">Healthy Foods</div>\r\n    <div class=\"dropzone\" data-group=\"B\" data-title=\"Junk Foods\" style=\"position: absolute; left: 483px; top: 218px; width: 351px; height: 358px; border: 2px solid transparent;\">\r\n        <img src=\"https://demoadmin.fefdybraingym.com/public/uploads/editor-img/1773739056611-166487088.png\" alt=\"Drop Zone B\" style=\"width: 100%; height: 100%; pointer-events: none; user-select: none;\">\r\n    </div>\r\n    <div class=\"dropzone-title\" style=\"position: absolute; left: 577px; top: 518px; font-size: 14.5px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 10px 10px; border-radius: 50px; font-weight: 900; box-shadow: 0 8px 0 #d63d52, 0 10px 25px rgba(245, 87, 108, 0.4); border: 5px solid #fff; z-index: 100; font-family: 'Comic Sans MS', 'Chalkboard SE', cursive; text-transform: uppercase; letter-spacing: 2px; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);\">Junk Foods</div>\r\n\r\n<div class=\"item\" data-group=\"A\" data-name=\"apple\" data-answer-x=\"26\" data-answer-y=\"325\" data-answer-width=\"97\" data-answer-height=\"95\" style=\"position: absolute; left: 699px; top: 34px; width: 97px; height: 95px; cursor: move; user-select: none; z-index: 10;\">\r\n    <img src=\"https://demoadmin.fefdybraingym.com/public/uploads/editor-img/1773738457951-929399191.png\" alt=\"apple\" style=\"width: 100%; height: 100%; pointer-events: none; user-select: none; -webkit-user-drag: none;\">\r\n</div>\r\n<div class=\"item\" data-group=\"A\" data-name=\"egg\" data-answer-x=\"195\" data-answer-y=\"434\" data-answer-width=\"112\" data-answer-height=\"93\" style=\"position: absolute; left: 347px; top: 79px; width: 112px; height: 93px; cursor: move; user-select: none; z-index: 10;\">\r\n    <img src=\"https://demoadmin.fefdybraingym.com/public/uploads/editor-img/1773738466471-546989949.png\" alt=\"egg\" style=\"width: 100%; height: 100%; pointer-events: none; user-select: none; -webkit-user-drag: none;\">\r\n</div>\r\n<div class=\"item\" data-group=\"A\" data-name=\"banana\" data-answer-x=\"74\" data-answer-y=\"425\" data-answer-width=\"114\" data-answer-height=\"90\" style=\"position: absolute; left: 528px; top: 50px; width: 114px; height: 90px; cursor: move; user-select: none; z-index: 10;\">\r\n    <img src=\"https://demoadmin.fefdybraingym.com/public/uploads/editor-img/1773738484626-296102663.png\" alt=\"banana\" style=\"width: 100%; height: 100%; pointer-events: none; user-select: none; -webkit-user-drag: none;\">\r\n</div>\r\n<div class=\"item\" data-group=\"A\" data-name=\"milk\" data-answer-x=\"127\" data-answer-y=\"243\" data-answer-width=\"98\" data-answer-height=\"101\" style=\"position: absolute; left: 455px; top: 155px; width: 98px; height: 101px; cursor: move; user-select: none; z-index: 10;\">\r\n    <img src=\"https://demoadmin.fefdybraingym.com/public/uploads/editor-img/1773738506446-242368099.png\" alt=\"milk\" style=\"width: 100%; height: 100%; pointer-events: none; user-select: none; -webkit-user-drag: none;\">\r\n</div>\r\n<div class=\"item\" data-group=\"B\" data-name=\"pizza\" data-answer-x=\"680\" data-answer-y=\"287\" data-answer-width=\"105\" data-answer-height=\"90\" style=\"position: absolute; left: 22px; top: 16px; width: 105px; height: 90px; cursor: move; user-select: none; z-index: 10;\">\r\n    <img src=\"https://demoadmin.fefdybraingym.com/public/uploads/editor-img/1773738546478-974410599.png\" alt=\"pizza\" style=\"width: 100%; height: 100%; pointer-events: none; user-select: none; -webkit-user-drag: none;\">\r\n</div>\r\n<div class=\"item\" data-group=\"B\" data-name=\"burgur\" data-answer-x=\"663\" data-answer-y=\"428\" data-answer-width=\"116\" data-answer-height=\"89\" style=\"position: absolute; left: 190px; top: 33px; width: 116px; height: 89px; cursor: move; user-select: none; z-index: 10;\">\r\n    <img src=\"https://demoadmin.fefdybraingym.com/public/uploads/editor-img/1773738561358-634821105.png\" alt=\"burgur\" style=\"width: 100%; height: 100%; pointer-events: none; user-select: none; -webkit-user-drag: none;\">\r\n</div>\r\n<div class=\"item\" data-group=\"B\" data-name=\"french fries\" data-answer-x=\"507\" data-answer-y=\"292\" data-answer-width=\"106\" data-answer-height=\"113\" style=\"position: absolute; left: 21px; top: 135px; width: 106px; height: 113px; cursor: move; user-select: none; z-index: 10;\">\r\n    <img src=\"https://demoadmin.fefdybraingym.com/public/uploads/editor-img/1773738578644-867501917.png\" alt=\"french fries\" style=\"width: 100%; height: 100%; pointer-events: none; user-select: none; -webkit-user-drag: none;\">\r\n</div>\r\n<div class=\"item\" data-group=\"B\" data-name=\"ice cream\" data-answer-x=\"538\" data-answer-y=\"420\" data-answer-width=\"113\" data-answer-height=\"98\" style=\"position: absolute; left: 215px; top: 138px; width: 113px; height: 98px; cursor: move; user-select: none; z-index: 10;\">\r\n    <img src=\"https://demoadmin.fefdybraingym.com/public/uploads/editor-img/1773738613714-751895635.png\" alt=\"ice cream\" style=\"width: 100%; height: 100%; pointer-events: none; user-select: none; -webkit-user-drag: none;\">\r\n</div>\r\n<div class=\"item\" data-group=\"B\" data-name=\"soft drink\" data-answer-x=\"614\" data-answer-y=\"237\" data-answer-width=\"91\" data-answer-height=\"105\" style=\"position: absolute; left: 374px; top: 274px; width: 91px; height: 105px; cursor: move; user-select: none; z-index: 10;\">\r\n    <img src=\"https://demoadmin.fefdybraingym.com/public/uploads/editor-img/1773738631382-242864862.png\" alt=\"soft drink\" style=\"width: 100%; height: 100%; pointer-events: none; user-select: none; -webkit-user-drag: none;\">\r\n</div>\r\n<div class=\"item\" data-group=\"A\" data-name=\"avacado\" data-answer-x=\"199\" data-answer-y=\"313\" data-answer-width=\"126\" data-answer-height=\"87\" style=\"position: absolute; left: 682px; top: 160px; width: 126px; height: 87px; cursor: move; user-select: none; z-index: 10;\">\r\n    <img src=\"https://demoadmin.fefdybraingym.com/public/uploads/editor-img/1773738741894-377348875.png\" alt=\"avacado\" style=\"width: 100%; height: 100%; pointer-events: none; user-select: none; -webkit-user-drag: none;\">\r\n</div>\r\n</div>"
            //     },
            //     "question": {
            //         "text": "Drag the foods and drop them into the correct plates"
            //     }
            // };
            const preloadData = old_data;

            setTimeout(() => loadFromJSON(preloadData), 0);

            document.getElementById("bg-upload").addEventListener("change", (e) => {
              const file = e.target.files[0];
              if (!file) return;

              const formData = new FormData();
              formData.append("editor_image", file);

              $.ajax({
                url: "/admin/image-upload",
                type: "POST",
                data: formData,
                processData: false,
                contentType: false,
                success: function (res) {
                  console.log("BG Uploaded:", res.filename);
                  bgImageUrl = assetURL + res.filename;
                  canvas.style.backgroundImage = `url('${bgImageUrl}')`;
                  canvas.style.backgroundSize = "cover";
                  canvas.style.backgroundPosition = "center";
                  e.target.value = "";
                },
                error: function () {
                  console.error("BG Upload failed");
                },
              });
            });

            document.getElementById("dropzone-upload").addEventListener("change", (e) => {
              const file = e.target.files[0];
              if (!file) return;

              const groupCount = elements.filter((el) => el.type === "dropzone").length;
              if (groupCount >= 2) {
                alert("Only 2 drop zones allowed (Group A & B)");
                e.target.value = "";
                return;
              }

              const group = groupCount === 0 ? "A" : "B";

              const formData = new FormData();
              formData.append("editor_image", file);

              $.ajax({
                url: "/admin/image-upload",
                type: "POST",
                data: formData,
                processData: false,
                contentType: false,
                success: function (res) {
                  console.log("Dropzone Uploaded:", res.filename);
                  const imageUrl = assetURL + res.filename;
                  addElement("dropzone", imageUrl, group);
                  e.target.value = "";
                },
                error: function () {
                  console.error("Dropzone Upload failed");
                },
              });
            });

            document.getElementById("item-upload").addEventListener("change", (e) => {
              const file = e.target.files[0];
              if (!file) return;

              const formData = new FormData();
              formData.append("editor_image", file);

              $.ajax({
                url: "/admin/image-upload",
                type: "POST",
                data: formData,
                processData: false,
                contentType: false,
                success: function (res) {
                  console.log("Item Uploaded:", res.filename);
                  const imageUrl = assetURL + res.filename;
                  addElement("item", imageUrl, "A");
                  e.target.value = "";
                },
                error: function () {
                  console.error("Item Upload failed");
                },
              });
            });

            // document.getElementById("bg-upload").addEventListener("change", (e) => {
            //     const file = e.target.files[0];
            //     if (!file) return;
            //     bgImageUrl = URL.createObjectURL(file);
            //     canvas.style.backgroundImage = `url('${bgImageUrl}')`;
            //     canvas.style.backgroundSize = "cover";
            //     canvas.style.backgroundPosition = "center";
            //     e.target.value = "";
            // });

            // document.getElementById("dropzone-upload").addEventListener("change", (e) => {
            //     const file = e.target.files[0];
            //     if (!file) return;
            //     const groupCount = elements.filter((el) => el.type === "dropzone").length;
            //     if (groupCount >= 2) {
            //         alert("Only 2 drop zones allowed (Group A & B)");
            //         e.target.value = "";
            //         return;
            //     }
            //     const group = groupCount === 0 ? "A" : "B";
            //     const imageUrl = URL.createObjectURL(file);
            //     addElement("dropzone", imageUrl, group);
            //     e.target.value = "";
            // });

            // document.getElementById("item-upload").addEventListener("change", (e) => {
            //     const file = e.target.files[0];
            //     if (!file) return;
            //     const imageUrl = URL.createObjectURL(file);
            //     addElement("item", imageUrl, "A");
            //     e.target.value = "";
            // });

            function addElement(type, imgSrc, group) {
                const id = "el-" + Date.now();
                let title = "";
                if (type === "dropzone") {
                    title =
                        prompt(`Enter title for Drop Zone ${group}:`) || `Drop Zone ${group}`;
                }
                let itemName = "";
                if (type === "item") {
                    itemName =
                        prompt("Enter name for this item:") ||
                        "Item " + (elements.filter((e) => e.type === "item").length + 1);
                }

                const el = {
                    id,
                    type,
                    imgSrc,
                    group,
                    x: 50,
                    y: 50,
                    width: 150,
                    height: 150,
                    answerSpot: null,
                    title: title,
                    titleX: type === "dropzone" ? 50 : 0,
                    titleY: type === "dropzone" ? 200 : 0,
                    titleFontSize: type === "dropzone" ? 24 : 0,
                    itemName: itemName,
                };

                elements.push(el);
                renderElement(el);
            }

            function renderElement(el) {
                const existing = document.getElementById(el.id);
                if (existing) {
                    existing.remove();
                }

                const div = document.createElement("div");
                div.className = "gge-canvas-item";
                div.id = el.id;
                div.style.left = el.x + "px";
                div.style.top = el.y + "px";
                div.style.width = el.width + "px";
                div.style.height = el.height + "px";

                const img = document.createElement("img");
                img.src = el.imgSrc;
                img.draggable = false;
                div.appendChild(img);

                const label = document.createElement("div");
                label.className = "gge-item-label";
                label.textContent =
                    el.type === "dropzone"
                        ? `Drop Zone ${el.group}`
                        : `Item (Group ${el.group})`;
                div.appendChild(label);

                const handle = document.createElement("div");
                handle.className = "gge-resize-grip";
                div.appendChild(handle);

                if (el.type === "dropzone" && el.title) {
                    const existingTitle = document.getElementById(el.id + "-title");
                    if (existingTitle) {
                        existingTitle.remove();
                    }

                    const titleDiv = document.createElement("div");
                    titleDiv.className = "gge-zone-title";
                    titleDiv.id = el.id + "-title";
                    titleDiv.textContent = el.title;
                    titleDiv.style.left = el.titleX + "px";
                    titleDiv.style.top = el.titleY + "px";
                    titleDiv.style.fontSize = (el.titleFontSize || 24) + "px";

                    const titleResizeHandle = document.createElement("div");
                    titleResizeHandle.className = "gge-title-resize-grip";
                    titleDiv.appendChild(titleResizeHandle);

                    titleDiv.addEventListener("mousedown", (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        selectElement(el);

                        if (e.target.className === "gge-title-resize-grip") {
                            isResizing = true;
                            isDragging = false;

                            const coords = getCanvasCoords(e.clientX, e.clientY);
                            elementStartPos.fontSize = el.titleFontSize || 24;
                            dragStartPos.x = coords.x;
                            dragStartPos.y = coords.y;
                            dragStartPos.isTitleResize = true;
                        } else {
                            isDragging = true;
                            isResizing = false;

                            const coords = getCanvasCoords(e.clientX, e.clientY);
                            elementStartPos.x = el.titleX;
                            elementStartPos.y = el.titleY;
                            dragStartPos.x = coords.x;
                            dragStartPos.y = coords.y;
                            dragStartPos.isTitle = true;
                        }
                    });

                    canvas.appendChild(titleDiv);
                }

                div.addEventListener("mousedown", (e) => {
                    e.preventDefault();

                    if (e.target.className === "gge-resize-grip") {
                        isResizing = true;
                        isDragging = false;
                        selectedElement = el;
                        selectElement(el);

                        const coords = getCanvasCoords(e.clientX, e.clientY);
                        elementStartPos.x = el.width;
                        elementStartPos.y = el.height;
                        dragStartPos.x = coords.x;
                        dragStartPos.y = coords.y;

                        e.stopPropagation();
                        return;
                    }

                    selectElement(el);
                    isDragging = true;
                    isResizing = false;

                    const coords = getCanvasCoords(e.clientX, e.clientY);
                    elementStartPos.x = el.x;
                    elementStartPos.y = el.y;
                    dragStartPos.x = coords.x;
                    dragStartPos.y = coords.y;
                });

                canvas.appendChild(div);

                if (selectedElement && selectedElement.id === el.id) {
                    div.classList.add("gge-selected");
                }

                if (el.type === "item" && el.answerSpot) {
                    div.classList.add("gge-has-answer");
                }
            }

            function selectElement(el) {
                document
                    .querySelectorAll(".gge-canvas-item")
                    .forEach((e) => e.classList.remove("gge-selected"));
                document
                    .querySelectorAll(".gge-zone-title")
                    .forEach((t) => t.classList.remove("gge-selected"));

                document.getElementById(el.id).classList.add("gge-selected");

                const titleDiv = document.getElementById(el.id + "-title");
                if (titleDiv) {
                    titleDiv.classList.add("gge-selected");
                }

                selectedElement = el;
                showProperties(el);
            }

            function showProperties(el) {
                const propertyFields = document.getElementById("property-fields");

                let answerSpotHTML = "";
                if (el.type === "item") {
                    if (el.answerSpot) {
                        answerSpotHTML = `
          <label class="gge-props-label">Answer Spot Set ✓</label>
          <div style="background: #1a1f2e; padding: 8px 12px; border-radius: 6px; margin-bottom: 16px; font-size: 12px; color: #10b981;">
              X: ${Math.round(el.answerSpot.x)}, Y: ${Math.round(el.answerSpot.y)}
          </div>
          <div class="gge-btn-base gge-btn-primary gge-btn-compact" id="update-answer-spot" style="width: 100%; margin-bottom: 8px;">Update Answer Spot</div>
          <div class="gge-btn-base gge-btn-danger gge-btn-compact" id="clear-answer-spot" style="width: 100%; margin-bottom: 16px;">Clear Answer Spot</div>
      `;
                    } else {
                        answerSpotHTML = `
          <div class="gge-btn-base gge-btn-primary gge-btn-compact" id="set-answer-spot" style="width: 100%; margin-bottom: 16px;">Set Answer Spot</div>
      `;
                    }
                }

                propertyFields.innerHTML = `
  <label class="gge-props-label">Type</label>
  <input type="text" class="gge-props-text" value="${el.type === "dropzone" ? "Drop Zone" : "Draggable Item"
                    }" disabled>
  ${el.type === "item"
                        ? `
  <label class="gge-props-label">Item Name</label>
  <input type="text" id="prop-item-name" class="gge-props-text" value="${el.itemName || ""
                        }" style="font-weight: 600;">
  `
                        : ""
                    }
  <label class="gge-props-label">Group</label>
  ${el.type === "dropzone"
                        ? `
  <label class="gge-props-label">Title Text</label>
  <input type="text" id="prop-title" class="gge-props-text" value="${el.title || ""
                        }" style="font-weight: 600;">

  <label class="gge-props-label">Title X Position</label>
  <input type="number" id="prop-title-x" class="gge-props-number" value="${Math.round(
                            el.titleX
                        )}">

  <label class="gge-props-label">Title Y Position</label>
  <input type="number" id="prop-title-y" class="gge-props-number" value="${Math.round(
                            el.titleY
                        )}">
  `
                        : ""
                    }
  <label class="gge-props-label">Title Font Size</label>
  <input type="number" id="prop-title-fontsize" class="gge-props-number" value="${Math.round(
                        el.titleFontSize || 24
                    )}" min="12" max="72">
  <select id="prop-group" class="gge-props-select">
    <option value="A" ${el.group === "A" ? "selected" : ""}>Group A</option>
    <option value="B" ${el.group === "B" ? "selected" : ""}>Group B</option>
  </select>

  ${answerSpotHTML}

  <label class="gge-props-label">X Position</label>
  <input type="number" id="prop-x" class="gge-props-number" value="${Math.round(
                        el.x
                    )}">

  <label class="gge-props-label">Y Position</label>
  <input type="number" id="prop-y" class="gge-props-number" value="${Math.round(
                        el.y
                    )}">

  <label class="gge-props-label">Width</label>
  <input type="number" id="prop-width" class="gge-props-number" value="${Math.round(
                        el.width
                    )}">

  <label class="gge-props-label">Height</label>
  <input type="number" id="prop-height" class="gge-props-number" value="${Math.round(
                        el.height
                    )}">
  `;

                if (el.type === "item") {
                    document
                        .getElementById("prop-item-name")
                        .addEventListener("input", (e) => {
                            el.itemName = e.target.value;
                        });
                }

                if (el.type === "dropzone") {
                    document.getElementById("prop-title").addEventListener("input", (e) => {
                        el.title = e.target.value;
                        const titleDiv = document.getElementById(el.id + "-title");
                        if (titleDiv) {
                            titleDiv.textContent = el.title;
                        }
                    });

                    document.getElementById("prop-title-x").addEventListener("input", (e) => {
                        el.titleX = parseInt(e.target.value) || 0;
                        const titleDiv = document.getElementById(el.id + "-title");
                        if (titleDiv) {
                            titleDiv.style.left = el.titleX + "px";
                        }
                    });

                    document.getElementById("prop-title-y").addEventListener("input", (e) => {
                        el.titleY = parseInt(e.target.value) || 0;
                        const titleDiv = document.getElementById(el.id + "-title");
                        if (titleDiv) {
                            titleDiv.style.top = el.titleY + "px";
                        }
                    });

                    document
                        .getElementById("prop-title-fontsize")
                        .addEventListener("input", (e) => {
                            el.titleFontSize = parseInt(e.target.value) || 24;
                            const titleDiv = document.getElementById(el.id + "-title");
                            if (titleDiv) {
                                titleDiv.style.fontSize = el.titleFontSize + "px";
                            }
                        });
                }
                document.getElementById("prop-group").addEventListener("change", (e) => {
                    el.group = e.target.value;
                    renderElement(el);
                });
                ["x", "y", "width", "height"].forEach((prop) => {
                    document.getElementById(`prop-${prop}`).addEventListener("input", (e) => {
                        const value = parseInt(e.target.value) || 0;
                        el[prop] = value;
                        updateElementPosition(el);
                    });
                });

                if (el.type === "item") {
                    const setBtn = document.getElementById("set-answer-spot");
                    const updateBtn = document.getElementById("update-answer-spot");
                    const clearBtn = document.getElementById("clear-answer-spot");

                    if (setBtn) {
                        setBtn.onclick = () => {
                            enterAnswerSpotMode(el);
                        };
                    }
                    if (updateBtn) {
                        updateBtn.onclick = () => {
                            enterAnswerSpotMode(el);
                        };
                    }
                    if (clearBtn) {
                        clearBtn.onclick = () => {
                            el.answerSpot = null;
                            renderElement(el);
                            showProperties(el);
                        };
                    }
                }
            }

            function updateElementPosition(el) {
                const div = document.getElementById(el.id);
                div.style.left = el.x + "px";
                div.style.top = el.y + "px";
                div.style.width = el.width + "px";
                div.style.height = el.height + "px";
            }

            document.addEventListener("mousemove", (e) => {
                if (answerSpotMode && selectedElement && isDragging) {
                    const coords = getCanvasCoords(e.clientX, e.clientY);
                    const deltaX = coords.x - dragStartPos.x;
                    const deltaY = coords.y - dragStartPos.y;

                    selectedElement.x = Math.max(
                        0,
                        Math.min(1024 - selectedElement.width, elementStartPos.x + deltaX)
                    );
                    selectedElement.y = Math.max(
                        0,
                        Math.min(576 - selectedElement.height, elementStartPos.y + deltaY)
                    );

                    updateElementPosition(selectedElement);
                    return;
                }

                if (!selectedElement || (!isDragging && !isResizing)) return;

                const coords = getCanvasCoords(e.clientX, e.clientY);
                if (isResizing && dragStartPos.isTitleResize) {
                    const deltaX = coords.x - dragStartPos.x;

                    selectedElement.titleFontSize = Math.max(
                        12,
                        Math.min(72, elementStartPos.fontSize + deltaX / 2)
                    );

                    const titleDiv = document.getElementById(selectedElement.id + "-title");
                    if (titleDiv) {
                        titleDiv.style.fontSize = selectedElement.titleFontSize + "px";
                    }
                    const fontSizeInput = document.getElementById("prop-title-fontsize");
                    if (fontSizeInput) {
                        fontSizeInput.value = Math.round(selectedElement.titleFontSize);
                    }
                    return;
                }
                if (isDragging && dragStartPos.isTitle) {
                    const deltaX = coords.x - dragStartPos.x;
                    const deltaY = coords.y - dragStartPos.y;

                    selectedElement.titleX = elementStartPos.x + deltaX;
                    selectedElement.titleY = elementStartPos.y + deltaY;

                    const titleDiv = document.getElementById(selectedElement.id + "-title");
                    if (titleDiv) {
                        titleDiv.style.left = selectedElement.titleX + "px";
                        titleDiv.style.top = selectedElement.titleY + "px";
                    }
                    return;
                }
                if (isResizing) {
                    const deltaX = coords.x - dragStartPos.x;
                    const deltaY = coords.y - dragStartPos.y;

                    selectedElement.width = Math.max(50, elementStartPos.x + deltaX);
                    selectedElement.height = Math.max(50, elementStartPos.y + deltaY);

                    updateElementPosition(selectedElement);

                    document.getElementById("prop-width").value = Math.round(
                        selectedElement.width
                    );
                    document.getElementById("prop-height").value = Math.round(
                        selectedElement.height
                    );
                } else if (isDragging) {
                    const deltaX = coords.x - dragStartPos.x;
                    const deltaY = coords.y - dragStartPos.y;

                    selectedElement.x = Math.max(
                        0,
                        Math.min(1024 - selectedElement.width, elementStartPos.x + deltaX)
                    );
                    selectedElement.y = Math.max(
                        0,
                        Math.min(576 - selectedElement.height, elementStartPos.y + deltaY)
                    );

                    updateElementPosition(selectedElement);

                    document.getElementById("prop-x").value = Math.round(selectedElement.x);
                    document.getElementById("prop-y").value = Math.round(selectedElement.y);
                }
            });

            document.addEventListener("mouseup", () => {
                isDragging = false;
                if (dragStartPos.isTitle) {
                    dragStartPos.isTitle = false;
                }
                if (dragStartPos.isTitleResize) {
                    dragStartPos.isTitleResize = false;
                }
                isResizing = false;
            });

            document.getElementById("delete-btn").addEventListener("click", () => {
                if (!selectedElement) {
                    alert("No element selected");
                    return;
                }

                if (selectedElement.type === "dropzone") {
                    const titleDiv = document.getElementById(selectedElement.id + "-title");
                    if (titleDiv) {
                        titleDiv.remove();
                    }
                }

                const elementDiv = document.getElementById(selectedElement.id);
                if (elementDiv) {
                    elementDiv.remove();
                }

                elements = elements.filter((el) => el.id !== selectedElement.id);
                selectedElement = null;
                document.getElementById("property-fields").innerHTML =
                    '<div style="color: #94a3b8; font-size: 13px;">Select an element to view properties</div>';
            });

            document.getElementById("export-btn").addEventListener("click", () => {
                const dropzones = elements.filter((el) => el.type === "dropzone");
                const items = elements.filter((el) => el.type === "item");

                if (dropzones.length !== 2) {
                    alert("Please add exactly 2 drop zones (Group A & B)");
                    return;
                }

                if (items.length === 0) {
                    alert("Please add at least one draggable item");
                    return;
                }

                const divHTML = generateDivHTML();
                $("#dragdrop_editor_html_val").val(divHTML);
                $("#questionCardContainer .form-submit-button").attr("disabled", false);
                console.log(divHTML);
                alert("Div HTML logged to console. Press F12 to view.");
            });

            // Answer Spot Mode Functions
            function enterAnswerSpotMode(el) {
                answerSpotMode = true;
                const overlay = document.getElementById("answer-spot-overlay");
                overlay.classList.add("gge-active");

                const originalPos = {
                    x: el.x,
                    y: el.y,
                    width: el.width,
                    height: el.height,
                };

                if (el.answerSpot) {
                    el.x = el.answerSpot.x;
                    el.y = el.answerSpot.y;
                    el.width = el.answerSpot.width;
                    el.height = el.answerSpot.height;
                    updateElementPosition(el);
                    showProperties(el);
                }

                const div = document.getElementById(el.id);
                div.classList.add("gge-answer-mode");

                const lockBtn = document.getElementById("answer-spot-lock");
                const doneBtn = document.getElementById("answer-spot-done");
                const cancelBtn = document.getElementById("answer-spot-cancel");
                const message = document.getElementById("answer-spot-message");

                lockBtn.style.display = "block";
                doneBtn.style.display = "none";
                message.textContent =
                    "Drag and resize the item, then click Lock when ready";

                let lockedPosition = null;

                lockBtn.onclick = () => {
                    lockedPosition = {
                        x: el.x,
                        y: el.y,
                        width: el.width,
                        height: el.height,
                    };

                    lockBtn.style.display = "none";
                    doneBtn.style.display = "block";
                    message.textContent =
                        "Position locked! Click Done to save or Cancel to adjust";

                    div.style.borderStyle = "solid";
                    div.style.borderColor = "#10b981";
                };

                doneBtn.onclick = () => {
                    if (lockedPosition) {
                        el.answerSpot = {
                            x: lockedPosition.x,
                            y: lockedPosition.y,
                            width: lockedPosition.width,
                            height: lockedPosition.height,
                        };

                        el.x = originalPos.x;
                        el.y = originalPos.y;
                        el.width = originalPos.width;
                        el.height = originalPos.height;
                        updateElementPosition(el);

                        exitAnswerSpotMode(el);
                        renderElement(el);
                        showProperties(el);
                    }
                };

                cancelBtn.onclick = () => {
                    el.x = originalPos.x;
                    el.y = originalPos.y;
                    el.width = originalPos.width;
                    el.height = originalPos.height;
                    updateElementPosition(el);
                    showProperties(el);
                    exitAnswerSpotMode(el);
                };
            }

            function exitAnswerSpotMode(el) {
                answerSpotMode = false;
                isDragging = false;
                isResizing = false;

                const overlay = document.getElementById("answer-spot-overlay");
                overlay.classList.remove("gge-active");

                const div = document.getElementById(el.id);
                div.classList.remove("gge-answer-mode");
                div.style.borderStyle = "";
                div.style.borderColor = "";
            }

            function generateDivHTML() {
                const dropzones = elements.filter((el) => el.type === "dropzone");
                const items = elements.filter((el) => el.type === "item");

                let dropzoneHTML = "";
                dropzones.forEach((dz, index) => {
                    const titleHTML = dz.title
                        ? `
      <div class="dropzone-title" style="position: absolute; left: ${dz.titleX}px; top: ${dz.titleY}px; font-size: ${dz.titleFontSize}px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 10px 10px; border-radius: 50px; font-weight: 900; box-shadow: 0 8px 0 #d63d52, 0 10px 25px rgba(245, 87, 108, 0.4); border: 5px solid #fff; z-index: 100; font-family: 'Comic Sans MS', 'Chalkboard SE', cursive; text-transform: uppercase; letter-spacing: 2px; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);">${dz.title}</div>`
                        : "";

                    dropzoneHTML += `
      <div class="dropzone" data-group="${dz.group}" data-title="${dz.title || ""
                        }" style="position: absolute; left: ${dz.x}px; top: ${dz.y}px; width: ${dz.width
                        }px; height: ${dz.height}px; border: 2px solid transparent;">
          <img src="${dz.imgSrc}" alt="Drop Zone ${dz.group
                        }" style="width: 100%; height: 100%; pointer-events: none; user-select: none;">
      </div>${titleHTML}`;
                });

                let itemsHTML = "";
                items.forEach((item, index) => {
                    const answerAttrs = item.answerSpot
                        ? `data-answer-x="${item.answerSpot.x}" data-answer-y="${item.answerSpot.y}" data-answer-width="${item.answerSpot.width}" data-answer-height="${item.answerSpot.height}"`
                        : "";

                    itemsHTML += `
  <div class="item" data-group="${item.group}" data-name="${item.itemName || "Item " + (index + 1)
                        }" ${answerAttrs} style="position: absolute; left: ${item.x}px; top: ${item.y
                        }px; width: ${item.width}px; height: ${item.height
                        }px; cursor: move; user-select: none; z-index: 10;">
      <img src="${item.imgSrc}" alt="${item.itemName || "Item"
                        }" style="width: 100%; height: 100%; pointer-events: none; user-select: none; -webkit-user-drag: none;">
  </div>`;
                });

                return `<div class="game-container" style="position: relative; width: 1024px; height: 576px; background: #252d3d; ${bgImageUrl ? `background-image: url('${bgImageUrl}');` : ""
                    } background-size: cover; background-position: center; border: 1px solid #2d3748; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4); border-radius: 4px;">
  ${dropzoneHTML}
  ${itemsHTML}
  </div>`;
            }
        }