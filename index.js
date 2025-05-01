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

    // Slack modal with optional fields for Assignees, Labels, and Milestones
    const modalView = {
      type: "modal",
      callback_id: "create_issue_modal",
      title: {
        type: "plain_text",
        text: "Create GitHub Issue",
      },
      blocks: [
        {
          type: "section",
          block_id: "title_section",
          text: {
            type: "mrkdwn",
            text: "*Issue Title:*",
          },
          accessory: {
            type: "plain_text_input",
            action_id: "title_input",
            placeholder: {
              type: "plain_text",
              text: "Enter issue title",
            },
          },
        },
        {
          type: "section",
          block_id: "description_section",
          text: {
            type: "mrkdwn",
            text: "*Description:*",
          },
          accessory: {
            type: "plain_text_input",
            action_id: "description_input",
            placeholder: {
              type: "plain_text",
              text: "Enter issue description",
            },
          },
        },
        {
          type: "section",
          block_id: "assignees_section",
          text: {
            type: "mrkdwn",
            text: "*Assignees (Optional):*",
          },
          accessory: {
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
                value: "user_1",
              },
              {
                text: {
                  type: "plain_text",
                  text: "User 2",
                },
                value: "user_2",
              },
              // Add other users here
            ],
          },
        },
        {
          type: "section",
          block_id: "labels_section",
          text: {
            type: "mrkdwn",
            text: "*Labels (Optional):*",
          },
          accessory: {
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
                  text: "Enhancement",
                },
                value: "enhancement",
              },
              // Add other labels here
            ],
          },
        },
        {
          type: "section",
          block_id: "milestones_section",
          text: {
            type: "mrkdwn",
            text: "*Milestones (Optional):*",
          },
          accessory: {
            type: "multi_static_select",
            action_id: "milestones_input",
            placeholder: {
              type: "plain_text",
              text: "Select milestones",
            },
            options: [
              {
                text: {
                  type: "plain_text",
                  text: "Milestone 1",
                },
                value: "milestone_1",
              },
              {
                text: {
                  type: "plain_text",
                  text: "Milestone 2",
                },
                value: "milestone_2",
              },
              // Add other milestones here
            ],
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Submit",
              },
              action_id: "submit_button",
              style: "primary",
            },
          ],
        },
      ],
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

  // Extract title, description, assignees, labels, and milestones from modal input
  const title = payload.state.values.title_section.title_input.value;
  const description = payload.state.values.description_section.description_input.value;

  // Get Assignees (if none selected, set to "No assignees selected")
  const assignees = payload.state.values.assignees_section.assignees_input.selected_options.length
    ? payload.state.values.assignees_section.assignees_input.selected_options.map(option => option.value)
    : ["No assignees selected"];

  // Get Labels (if none selected, set to "No labels selected")
  const labels = payload.state.values.labels_section.labels_input.selected_options.length
    ? payload.state.values.labels_section.labels_input.selected_options.map(option => option.value)
    : ["No labels selected"];

  // Get Milestones (if none selected, set to "No milestones selected")
  const milestones = payload.state.values.milestones_section.milestones_input.selected_options.length
    ? payload.state.values.milestones_section.milestones_input.selected_options.map(option => option.value)
    : ["No milestones selected"];

  // Send issue creation request to GitHub Actions workflow
  try {
    await axios.post(
      `https://api.github.com/repos/${process.env.REPO}/actions/workflows/create-issue.yml/dispatches`,
      {
        ref: "main", // or your default branch
        inputs: {
          title,
          body: description,
          assignees: assignees.join(", "), // Convert array to string
          labels: labels.join(", "),
          milestones: milestones.join(", "),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PERSONAL_ACCESS_TOKEN}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    res.send({
      response_action: "clear", // Close the modal after submitting
    });
    console.log(`Issue created: ${title}\n${description}\nAssignees: ${assignees}\nLabels: ${labels}\nMilestones: ${milestones}`);
  } catch (err) {
    console.error("Error creating GitHub issue:", err);
    res.send({
      response_action: "update", // Keep the modal open
      view: {
        type: "modal",
        callback_id: "create_issue_modal",
        title: {
          type: "plain_text",
          text: "Create GitHub Issue",
        },
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*Something went wrong, please try again later*",
            },
          },
        ],
      },
    });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
