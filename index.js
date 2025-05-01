const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// Slack's verification token (to ensure the request is from Slack)
const slackVerificationToken = process.env.SLACK_VERIFICATION_TOKEN;

app.post("/slack/actions", async (req, res) => {
  const payload = req.body;

  // Slash command
  if (payload.command === "/create-issue") {
    const trigger_id = payload.trigger_id;

    const modalView = {
      type: "modal",
      callback_id: "create_issue_modal",
      title: {
        type: "plain_text",
        text: "Create GitHub Issue",
      },
      blocks: [
        {
          type: "input",
          block_id: "title_section",
          label: {
            type: "plain_text",
            text: "Issue Title",
          },
          element: {
            type: "plain_text_input",
            action_id: "title_input",
          },
        },
        {
          type: "input",
          block_id: "description_section",
          label: {
            type: "plain_text",
            text: "Description",
          },
          element: {
            type: "plain_text_input",
            action_id: "description_input",
            multiline: true,
          },
        },
        {
          type: "input",
          block_id: "assignees_section",
          label: {
            type: "plain_text",
            text: "Assignees (Optional)",
          },
          element: {
            type: "multi_static_select",
            action_id: "assignees_input",
            placeholder: {
              type: "plain_text",
              text: "Select assignees",
            },
            options: [
              {
                text: {
                  type: "plain_text",
                  text: "User 1",
                },
                value: "user1",
              },
              {
                text: {
                  type: "plain_text",
                  text: "User 2",
                },
                value: "user2",
              },
            ],
          },
        },
        {
          type: "input",
          block_id: "labels_section",
          label: {
            type: "plain_text",
            text: "Labels (Optional)",
          },
          element: {
            type: "multi_static_select",
            action_id: "labels_input",
            placeholder: {
              type: "plain_text",
              text: "Select labels",
            },
            options: [
              {
                text: {
                  type: "plain_text",
                  text: "Bug",
                },
                value: "bug",
              },
              {
                text: {
                  type: "plain_text",
                  text: "Feature",
                },
                value: "feature",
              },
            ],
          },
        },
        {
          type: "input",
          block_id: "milestones_section",
          label: {
            type: "plain_text",
            text: "Milestone (Optional)",
          },
          element: {
            type: "static_select",
            action_id: "milestone_input",
            placeholder: {
              type: "plain_text",
              text: "Select milestone",
            },
            options: [
              {
                text: {
                  type: "plain_text",
                  text: "Milestone 1",
                },
                value: "milestone1",
              },
              {
                text: {
                  type: "plain_text",
                  text: "Milestone 2",
                },
                value: "milestone2",
              },
            ],
          },
        },
      ],
      submit: {
        type: "plain_text",
        text: "Submit",
      },
    };

    try {
      await axios.post(
        "https://slack.com/api/views.open",
        {
          trigger_id,
          view: modalView,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      return res.status(200).send(); // Respond to Slack immediately
    } catch (error) {
      console.error("Error opening modal:", error);
      return res.status(500).send("Failed to open modal");
    }
  }

  // Other types (like shortcuts) can still go here
});

app.post("/slack/interactive", async (req, res) => {
  const payload = JSON.parse(req.body.payload);

  if (payload.type === "view_submission") {
    const title = payload.view.state.values.title_section.title_input.value;
    const description = payload.view.state.values.description_section.description_input.value;

    // Capture Assignees, Labels, and Milestones
    const assignees = payload.view.state.values.assignees_section.assignees_input.selected_options.map(
      (option) => option.value
    );
    const labels = payload.view.state.values.labels_section.labels_input.selected_options.map(
      (option) => option.value
    );
    const milestone = payload.view.state.values.milestones_section.milestone_input.selected_option.value;

    console.log("Assignees:", assignees);
    console.log("Labels:", labels);
    console.log("Milestone:", milestone);

    // Trigger GitHub Action
    try {
      await axios.post(
        `https://api.github.com/repos/${process.env.REPO}/actions/workflows/create-issue.yml/dispatches`,
        {
          ref: "main",
          inputs: {
            title,
            body: description,
            assignees: assignees.join(","), // Convert array to string
            labels: labels.join(","), // Convert array to string
            milestone,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PERSONAL_ACCESS_TOKEN}`,
            Accept: "application/vnd.github+json",
          },
        }
      );

      // Respond to Slack to close the modal
      res.send({ response_action: "clear" });
    } catch (error) {
      console.error("GitHub dispatch error:", error.message);
      res.send({
        response_action: "errors",
        errors: {
          title_section: "Something went wrong. Try again.",
        },
      });
    }
  } else {
    res.status(200).send(); // Default response for other interactions
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
