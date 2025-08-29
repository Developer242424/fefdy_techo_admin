$(function () {
  getOrganisationsForDropMultiple("org_id");

  $("#sent_report_form").submit(function (e) {
    e.preventDefault();
    const $form = $(this);
    const $button = $form.find("button");
    $button.text("Submitting...");
    $button.attr("disabled", true);
    const formData = new FormData(this);
    $.ajax({
      url: "/admin/sent-report/sent-mail",
      method: "POST",
      data: formData,
      contentType: false,
      processData: false,
      success: function (res) {
        LoadStop();
        if (res.status === 200) {
          ToastAlert("success", res.message);
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
        $button.text("Submit");
        $button.removeAttr("disabled");
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

  $("#sent_report_organisations_form").submit(function (e) {
    e.preventDefault();
    const $form = $(this);
    const $button = $form.find("button");
    $button.text("Submitting...");
    $button.attr("disabled", true);
    const formData = new FormData(this);
    $.ajax({
      url: "/admin/sent-report/sent-mail/whole",
      method: "POST",
      data: formData,
      contentType: false,
      processData: false,
      success: function (res) {
        LoadStop();
        if (res.status === 200) {
          ToastAlert("success", res.message);
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
        $button.text("Submit");
        $button.removeAttr("disabled");
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
});
