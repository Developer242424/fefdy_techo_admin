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
    }
    else if (questionType === "6") {
      const questionBlock = $("#identifyquestionCardTemplate").html();
      if (questionBlock) {
        const appended = $(questionBlock).appendTo("#questionCardContainer");

        $("#questionCardContainer").data("active-template", "label-editor");

        IdentifyEditorTemplate(appended[0]);
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
  }
  else if (questionType === "6") {
    // ✅ corrected from "1"
    templateHtml = $("#identifyquestionCardTemplate").html();
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

  const publicURL = "https://demoadmin.fefdybraingym.com/public/";
  const assetURL = "https://demoadmin.fefdybraingym.com/public/uploads/editor-img/";

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
  const objects = new Map();

  const canvas = container.querySelector("#canvas-id");
  const addTextBtn = container.querySelector("#addTextBtn");
  const addRectBtn = container.querySelector("#addRectBtn");
  const addCircleBtn = container.querySelector("#addCircleBtn");
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

  function createId() {
    return "obj_" + nextId++;
  }

  function setSelected(id) {
    selectedId = id;
    updateSelectionStyles();
    updatePropertiesPanel();
  }

  function updateSelectionStyles() {
    const items = canvas.querySelectorAll(".canvas-item");
    items.forEach((item) => {
      if (item.dataset.id === selectedId) {
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

  function updatePropertiesPanel() {
    if (!selectedId || !objects.has(selectedId)) {
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

    if (objData.type === "text") {
      content.classList.add("text");
      content.contentEditable = "true";
      content.innerText = objData.text || "Text";
      content.addEventListener("input", () => {
        const obj = objects.get(objData.id);
        if (obj) obj.text = content.innerText;
      });
    }

    if (objData.type === "circle") {
      item.style.borderRadius = "999px";
    }

    if (objData.type === "image") {
      const img = document.createElement("img");
      img.src = objData.src;
      content.appendChild(img);
    }

    item.appendChild(content);

    const handle = document.createElement("div");
    handle.className = "resize-handle";
    item.appendChild(handle);

    item.addEventListener("mousedown", (e) => {
      if (e.target === handle || e.target.classList.contains("resize-handle")) return;
      setSelected(objData.id);
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

      setSelected(id);

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

  addRectBtn.addEventListener("click", (e) => {
    e.preventDefault();
    addRect();
  });

  addCircleBtn.addEventListener("click", (e) => {
    e.preventDefault();
    addCircle();
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

  [propX, propY, propWidth, propHeight, propRotation, propFontSize, propBgColor, propTextColor].forEach((input) => {
    input.addEventListener("input", syncPropertyChange);
  });
  propIsAnswer.addEventListener("change", syncPropertyChange);
  const questionTextarea = container.querySelector("textarea[name='array[0][question][text]']");
  if (questionTextarea) {
    questionTextarea.addEventListener("input", (e) => {
      appendIdentifyEditorText(e.target.value);
    });
  }

  function exportHTML() {
    const canvasWrapper = document.querySelector(".canvas-wrapper-id");
    const clonedWrapper = canvasWrapper.cloneNode(true);

    clonedWrapper.querySelectorAll(".resize-handle").forEach((h) => h.remove());
    clonedWrapper.querySelectorAll(".canvas-item").forEach((item) => {
      item.classList.remove("selected");
      const content = item.querySelector(".content");
      if (content) content.contentEditable = "false";
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
            font-family: 'Alata', sans-serif;
            padding: 16px 40px;
            background: transparent;
            font-size: 20px;
            font-weight: 400;
            letter-spacing: 0.5px;
            position: absolute;
            bottom: 39pc;
            z-index: 2;
            margin-bottom: 20px;
            text-align: center;
        }

        .question-space-id input {
            border: none;
            font-size: 26px;
            background: #faf1bf;
            padding: 4px 19px;
            border-radius: 12px;
            text-align: center;
            font-family: 'Alata', sans-serif;
            font-weight: 500;
            width: auto;
            min-width: 300px;
        }

        #canvas-id {
            width: ${canvasStyles.width};
            height: ${canvasStyles.height};
            background: ${canvasStyles.backgroundColor};
            ${canvasStyles.backgroundImage !== 'none' ? `background-image: ${canvasStyles.backgroundImage};` : ''}
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

    // console.log(htmlString);

    const hiddenInput = container.querySelector("input[name='array[0][html][data]']");
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
    if (!selectedId || !objects.has(selectedId)) return;
    const element = canvas.querySelector(`.canvas-item[data-id="${selectedId}"]`);
    if (element) element.remove();
    objects.delete(selectedId);
    selectedId = null;
    updateSelectionStyles();
    updatePropertiesPanel();
  });

  bringForwardBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (!selectedId) return;
    const element = canvas.querySelector(`.canvas-item[data-id="${selectedId}"]`);
    if (element && element.nextElementSibling) {
      element.parentNode.insertBefore(element.nextElementSibling, element);
    }
  });

  sendBackBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (!selectedId) return;
    const element = canvas.querySelector(`.canvas-item[data-id="${selectedId}"]`);
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