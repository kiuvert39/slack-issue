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




// This endpoint is used to listen to Slack events
// app.post("/slack/actions", async (req, res) => {
//   const { type, payload } = req.body;
  
//   // Verify that the request is from Slack
//   if (payload.token !== slackVerificationToken) {
//     return res.send("Invalid request");
//   }

//   // If the user is invoking the slash command
//   if (type === "shortcut") {
//     const trigger_id = payload.trigger_id;

//     // Open a modal with input fields
//     const modalView = {
//       type: "modal",
//       callback_id: "create_issue_modal",
//       title: {
//         type: "plain_text",
//         text: "Create GitHub Issue",
//       },
//       blocks: [
//         {
//           type: "section",
//           block_id: "title_section",
//           text: {
//             type: "mrkdwn",
//             text: "*Issue Title:*",
//           },
//           accessory: {
//             type: "plain_text_input",
//             action_id: "title_input",
//             placeholder: {
//               type: "plain_text",
//               text: "Enter issue title",
//             },
//           },
//         },
//         {
//           type: "section",
//           block_id: "description_section",
//           text: {
//             type: "mrkdwn",
//             text: "*Description:*",
//           },
//           accessory: {
//             type: "plain_text_input",
//             action_id: "description_input",
//             placeholder: {
//               type: "plain_text",
//               text: "Enter issue description",
//             },
//           },
//         },
//         {
//           type: "actions",
//           elements: [
//             {
//               type: "button",
//               text: {
//                 type: "plain_text",
//                 text: "Submit",
//               },
//               action_id: "submit_button",
//               style: "primary",
//             },
//           ],
//         },
//       ],
//     };

//     // Send request to Slack API to open the modal
//     try {
//       await axios.post("https://slack.com/api/views.open", {
//         trigger_id,
//         view: modalView,
//       }, {
//         headers: {
//           Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
//           "Content-Type": "application/json",
//         },
//       });
//       res.status(200).send(); // Acknowledge that the modal was opened
//     } catch (error) {
//       console.error("Error opening modal:", error);
//       res.status(500).send("Failed to open modal");
//     }
//   }
// });

// // Handle the modal submission
// app.post("/slack/interactive", async (req, res) => {
//   const payload = JSON.parse(req.body.payload);

//   // Extract title and description from modal input
//   const title = payload.state.values.title_section.title_input.value;
//   const description = payload.state.values.description_section.description_input.value;

//   // Send issue creation request to GitHub Actions workflow
//   try {
//     const response = await axios.post(
//       `https://api.github.com/repos/${process.env.REPO}/actions/workflows/create-issue.yml/dispatches`,
//       {
//         ref: "main",
//         inputs: {
//           title,
//           body: description,
//         },
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${process.env.PERSONAL_ACCESS_TOKEN}`,
//           Accept: "application/vnd.github+json",
//         },
//       }
//     );
//     console.log(response.data); // Log full response for debugging
//   } catch (err) {
//     console.error("Error creating GitHub issue:", err.response?.data || err.message);
//     res.send({
//       response_action: "update",
//       view: {
//         type: "modal",
//         callback_id: "create_issue_modal",
//         title: {
//           type: "plain_text",
//           text: "Create GitHub Issue",
//         },
//         blocks: [
//           {
//             type: "section",
//             text: {
//               type: "mrkdwn",
//               text: "*Something went wrong, please try again later*",
//             },
//           },
//         ],
//       },
//     });
//   }
  
// });


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
