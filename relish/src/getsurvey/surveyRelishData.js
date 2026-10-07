const surveyRelishData = {
    title: "Food & Culture Questionnaire: Tell Us About Your Culinary World!",
    logo: "/Relish_Logo_Master_01.png",
    showNavigationButtons: true,
    navigationButtonsLocation: "topBottom",
    pages: [
      {
        name: "about_project",
        elements: [
          {
            type: "html",
            name: "project_info",
            html: `
            <p>Welcome! We’re excited to learn about your food habits, cultural traditions, and cooking experiences. This questionnaire is all about discovering what shapes your meals, from daily routines to special occasions. Your answers will help us understand your unique food story, so feel free to share as much as you like!</p>
            <p>This questionnaire is part of the European project RELISH – Reframing European Gastronomy Legacy through Innovation, Sustainability and Heritage (reference 101177427), funded under the Horizon Europe program (HORIZON-CL2-2024-HERITAGE-01).</p>
            <p>This questionnaire is anonymous. We do not collect names or personal identifiers, and your responses will never be linked to your identity. Data will be securely stored and used exclusively for educational, research, and cultural purposes within the RELISH project. The insights gathered may inform academic publications, workshops, exhibitions, or creative formats—always in a way that respects and protects your anonymity.</p>
            <p>If you have any questions, please contact the RELISH team through the project website (<a href="https://relisheu.org" target="_blank">relisheu.org</a>).</p>
            <p>Clicking COMPLETE means you have consented to share your responses with us to use them in the way we’ve explained in the survey description (see “Show Information” below).</p>
            <p>Thank you for your time, your voice, and your perspective. Let’s dive in!</p>
            `
          },
          {
            type: "boolean",
            name: "show_more_info",
            title: `Click here for more information before filling out the questionnaire.`,
            labelTrue: "Show information",
            labelFalse: "Hide information",
            defaultValue: false
            },
            {
            type: "html",
            name: "risks_benefits_institutional_contact",
            visibleIf: "{show_more_info} = true",
            html: `
            <h6>Thank you for your interest in taking this survey!</h6>
            <p>We are RELISH, a group of researchers working on a project about how food recipes and practices adapt to changing people and environments in Europe, today and in the future. RELISH is a project funded by Horizon Europe, a form of European funding that is awarded to groups of researchers from different universities, research centres and community organisations across Europe on a topic that can benefit or improve society.  
            <h6>What is this survey about? </h6>
            <p>We created these questions to understand how your thoughts and everyday cooking or eating activities relate to the way that you live and connect with others through food.  </p>
            <p>By answering these questions, you will help us gain important insights about you and others’ connections or interests in foods that might have national, regional, or personal significance. We’re particularly interested to know if where you grew up, moved to, or who you eat with impacts these connections or interests, and how you see connections to food in your future life in a changing world.  </p>
            <h6>What kinds of questions am I responding to? </h6>
            <p>We’re asking questions in the form of multiple-choice, short and long-written responses. We’re not going to ask you anything stressful or negative. It might be boring, but we hope that you’ll have fun taking the survey! </p>
            <h6>How long is this going to take? </h6>
            <p>We think the Food & Culture Questionnaire will take about 15 min, and the Futures and Visions survey about 20 min. Ideally, we would like respondents to take both parts, but you do not have to complete and submit them at the same time.  </p>
            <h6>What are my options when taking this survey? </h6>
            <p>It’s totally up to you whether you want to complete the survey. We won’t be collecting your name or contact info, or any specific information that could identify you. You should never expect any negative pushback from anyone on our team if you choose not to take any of the surveys.   </p>
            <p>If you do want to connect with us further after taking the survey, we have some options for you: </p>
            <p>You can send us your email after submitting one or more of the survey parts to keep in touch with RELISH and participate in other activities we’re up to. We’ll make sure your contact info isn’t shared with anyone except for the RELISH team, and your email won’t be linked to your survey responses.  </p>
            <p>If you’re interested in taking future surveys with us, feel free to bookmark this web application. The app will have up to date information about new surveys available for you to take. We’ll also use it to update you about how your responses were used in our project! </p>
            <h6>Who has access to my responses? </h6>
            <p>We store your responses in a secure database to stop anyone from accessing or copying this data. Your individual responses will be anonymous and will only be seen by RELISH researchers.  </p>
            <p>We will never collect any information except for the responses you provide, and your email if you choose to provide this. Our team developed this web app, so no third-party can spy on how, when, and where you use this either! </p>
            <h6>What if I change my mind? </h6>
            <p>Right before you finish and submit a survey part, you’ll get a brief message about how clicking “Complete” means you’ve consented to send your responses to us to use them in the way we’ve explained.   </p>
            <p>If at any time before clicking “Complete” you decide you don’t want to provide your responses, simply exit the survey! Nothing will be saved. If you change your mind later, you’ll have to restart the survey from scratch.  </p>
            <h6>What if I want to learn more, or reach out to someone about RELISH? </h6>
            <p>In the survey interface, you can access links to learn more about RELISH, some technical information and links about research ethics, and the contact info for the team who is running this survey.  </p>
            <p>You don’t have to take a survey to access any of these resources or get in contact with us—we’re always happy to connect and chat about food and recipes! </p>
            <h6>What happens after the survey? </h6>
            <p>Your data is going to be used by our team to do a few different things: after we collect responses, we’ll create visuals and preliminary analysis. You’ll be able to see these on the RELISH digital platform at a later date.  </p>
            <p>Your responses may inform academic publications, workshops, exhibitions, or creative formats—always in a way that respects and protects your anonymity. We’re happy to provide a copy of any of these outputs to you, and we’ll upload them to the RELISH digital platform for you to download or view as soon as they’re available. </p>
            <p>If you want, you can participate in other future surveys or opportunities to submit your experiences and food narratives to our team.  </p>
            <h6>Ready to start? </h6>
            <p>Find a comfy spot and grab a beverage, then click “[Next]” to begin! </p>
            <h6>Institutional Agreements and Funding</h6>
            <p>RELISH and its data gathering activities are funded by Horizon Europe (HE), under the call: <strong>HORIZON-CL2-2024-Heritage-01</strong>. Project information can be found on HE’s Cordis database through the following link:
            <a href="https://cordis.europa.eu/project/id/101177427" target="_blank">https://cordis.europa.eu/project/id/101177427</a>
            or Project №101177427</p>
            <p>As an HE-funded project, RELISH conforms to <a href="https://ec.europa.eu/info/funding-tenders/opportunities/docs/2021-2027/horizon/guidance/european-code-of-conduct-for-research-integrity_horizon_en.pdf" target="_blank"> "The European Code of Conduct for Research Integrity”</a> (European Commission, Revised Edition 2023), developed by the European Federation of Academies of Sciences and Humanities (ALLEA). The Code of Conduct outlines the principles, good research practices, and conditions of violating research integrity for all participating projects.</p>
            <p>The RELISH project is coordinated by <strong>Durham University (UK)</strong>.</p>

            <p><strong>The participating institutions are:</strong></p>
            <ul>
              <li>Fundació Alícia (Spain)</li>
              <li>University of Milan / Universitá degli Studi di Milano (Italy)</li>
              <li>University of Gastronomic Sciences / Universitá degli Studi di Scienze Gastronomiche (Italy)</li>
              <li>City, University of London (UK)</li>
              <li>University of Alicante / Universidad de Alicante (Spain)</li>
              <li>Research Centre of Institut LYFE / Centre de Recherche de l’Institut LYFE (France)</li>
              <li>Roskilde University / Roskilde Universitet (Denmark)</li>
              <li>University College Cork (Ireland)</li>
              <li>Atlantic Technological University, Galway (Ireland)</li>
              <li>Barcelona Supercomputing Center / Centro Nacional de Supercomputación (Spain)</li>
              <li>Instituto Superior Técnico at the University of Lisbon / Universidade de Lisboa (Portugal)</li>
              <li>University of Toronto, Scarborough (Canada)</li>
            </ul>

            <h6>Contact</h6>
            <p>Survey inquiries can be sent to the RELISH team through the project website (<a href="https://relisheu.org" target="_blank">relisheu.org</a>).</p>
            <p><strong>The following sources can also be consulted:</strong></p>
            <ul>
              <li>RELISH Cordis page: <a href="https://cordis.europa.eu/project/id/101177427" target="_blank">https://cordis.europa.eu/project/id/101177427</a> <p>or Project №101177427</p></li>
              <li>RELISH website: <a href="https://relisheu.org" target="_blank">relisheu.org</a></li>
            </ul>
          `
        }
        ]
      },
      {
        name: "about_you",
        title: `Section 1: About you
Let's start with a quick snapshot of who you are`,
        elements: [
              {
            type: "text",
            name: "email",
            title: "Email Address",
            description: `Response not required
Only in case you want to get feedback about our results, receive news about the project and/or become part of our community`,
            isRequired: false,
            inputType: "email"
          },
          {
            type: "radiogroup",
            name: "gender",
            title: "Gender",
            description: "Select one option",
            isRequired: true,
            choices: ["Male", "Female", "Non-binary", "Prefer not to say"],
            hasOther: true
          },
          {
            type: "radiogroup",
            name: "age",
            title: "Age",
            description: "Select one option",
            isRequired: true,
            choices: [
              "18 to 25",
              "26 to 30",
              "31 to 35",
              "36 to 40",
              "41 to 45",
              "46 to 50",
              "51 to 55",
              "56 to 60",
              "61 to 65",
              "Over 65"
            ]
          },
          {
            type: "dropdown",
            name: "country_birth",
            title: "In which country were you born?",
            description: "Select one option",
            choicesByUrl: {
              url: "/countries.json",
              valueName: "name.common"
            }
          },
          {
            type: "dropdown",
            name: "country_live",
            title: "In which country do you live?",
            description: "Select one option",
            choicesByUrl: {
              url: "/countries.json",
              valueName: "name.common"
            }
          },
          {
            type: "radiogroup",
            name: "current_situation",
            title: "What is your current situation?",
            description: "Select one option",
            isRequired: true,
            choices: ["Working", "Studying", "Working and studying", "Unemployed"]
          },
          {
            type: "radiogroup",
            name: "socioeconomic",
            title: "How would you describe your socioeconomic background?",
            description: "Select one option",
            isRequired: true,
            choices: ["Low-income", "Middle-income", "High-income", "Prefer not to say"]
          },
          {
            type: "checkbox",
            name: "living_with",
            title: "Who do you live with?",
            description: "Select all that apply",
            isRequired: true,
            choices: [
              "Parents",
              "Grandparents",
              "Friends and roommates",
              "Partner",
              "Kids",
              "Alone"
            ],
            hasOther: true
          },
          {
            type: "radiogroup",
            name: "lived_abroad",
            title: "Have you ever lived abroad?",
            description: "Select one option",
            isRequired: true,
            choices: ["Yes", "No"]
          }
        ]
      },
      {
  name: "lived_abroad_details",
  title: `Section 1: About you
Let's start with a quick snapshot of who you are`,
  visibleIf: "{lived_abroad} = 'Yes'",
  elements: [
    {
      type: "dropdown",
      name: "country_abroad",
      title: "Which country abroad have you lived in the longest?",
      description: "Select one option",
      choicesByUrl: {
              url: "/countries.json",
              valueName: "name.common"
            },
      isRequired: true
    },
    {
      type: "radiogroup",
      name: "longest_period_abroad",
      title: "What is the longest period you have lived abroad?",
      description: "Select one option",
      isRequired: true,
      choices: [
        "Less than 6 months",
        "Between 6 and 12 months",
        "More than 1 year"
      ]
    },
    {
      type: "radiogroup",
      name: "impact_on_eating",
      title: "To what extent did the experience change your way of eating?",
      description: "Select one option",
      isRequired: true,
      choices: [
        "Completely",
        "A lot",
        "Somewhat",
        "Little",
        "Not at all"
      ]
    }
  ]
},
{
  name: "impact_details",
  title: `Section 1: About you
Let's start with a quick snapshot of who you are`,
  visibleIf: "{impact_on_eating} notempty and {impact_on_eating} != 'Not at all'",
  elements: [
    {
      type: "text",
      name: "specify_impact",
      title: "Please specify what changed",
      isRequired: true
    }
  ]
},
{
  name: "connection_with_food",
  title: `Section 2:
Exploring your connection with food`,
  elements: [
    {
      type: "radiogroup",
      name: "dietary_preferences",
      title: "Do you follow any dietary preferences or restrictions?",
      description: "Select one option",
      isRequired: true,
      choices: [
        "None",
        "Flexitarian",
        "Vegetarian",
        "Vegan",
        "Gluten-free",
        "Dairy-free",
        "Halal",
        "Kosher"
      ],
      hasOther: true
    },
    {
      type: "checkbox",
      name: "food_priorities",
      title: "When choosing what to eat, what matters most to you?",
      description: "Select up to 3",
      isRequired: true,
      maxSelectedChoices: 3,
      choices: [
        "Health / Nutrition",
        "Sustainability",
        "Taste and pleasure",
        "To satisfy hunger",
        "Heritage / Identity",
        "Sharing / Socializing",
        "Convenience or ease of preparation",
        "Affordability",
        "Ethics / Animal Welfare / Labour Conditions"
      ],
      hasOther: true
    },
    {
      type: "matrix",
      name: "eating_habits",
      title: "How often do you eat in the following ways?",
      isRequired: true,
      isAllRowRequired: true,
      columns: [
        { value: "never", text: "Never" },
        { value: "rarely", text: "Rarely" },
        { value: "sometimes", text: "Sometimes" },
        { value: "frequently", text: "Frequently" }
      ],
      rows: [
        { value: "simple_home", text: "I make simple recipes at home" },
        { value: "elaborate_home", text: "I make elaborated recipes at home" },
        { value: "pre_made", text: "I buy pre-made or takeout food" },
        { value: "eat_out", text: "I eat out at restaurants or cafés" },
        { value: "family_meals", text: "I eat meals made by family or friends" }
      ]
    }],
    },{
  name: "food_habits",
    title: `Section 2:
Exploring your connection with food`,
    elements: [
    {
      type: "checkbox",
      name: "food_purchase_places",
      title: "Where do you usually buy most of your food?",
      description: "Select up to 3",
      isRequired: true,
      maxSelectedChoices: 3,
      choices: [
        "Supermarket",
        "Local grocery store",
        "Fresh food market",
        "Specialized stores",
        "Online store or delivery apps",
        "Directly from producers or cooperatives"
      ],
      hasOther: true
    },
    {
      type: "checkbox",
      name: "stocked_food_items",
      title: "What food items do you always keep stocked at home?",
      description: "Select all that apply",
      isRequired: true,
      choices: [
        "Rice, pasta",
        "Legumes (dry or canned)",
        "Nuts and dried fruits",
        "Snacks (chips, crackers, cookies, etc.)",
        "Ready-to-eat meals (pre-cooked dishes)",
        "Instant meals (quick-prep meals like instant noodles, dehydrated pasta dishes)",
        "Stocks, broths, or soups (bouillon cubes, liquid stock, ready-to-serve soups)",
        "Canned vegetables",
        "Canned fish or meat",
        "Frozen vegetables",
        "Frozen proteins (meat, fish and seafood)",
        "Fresh vegetables",
        "Tuber and roots",
        "Fresh fruit",
        "Dairy products",
        "Eggs",
        "Plant-base products (milk, cheese, yogurt, protein)",
        "Sauces, spreads, or dressings"
      ],
      hasOther: true
    },
    {
      type: "checkbox",
      name: "household_responsibility",
      description: "Select all that apply",
      title: "Who is mainly responsible for purchasing and cooking in your household?",
      isRequired: true,
      choices: [
        "Myself",
        "My partner",
        "My parents",
        "My children",
        "Another family member",
        "A roommate",
        "A housekeeper or hired help"
      ]
    },
    {
      type: "checkbox",
      name: "buying_influences",
      title: "When buying food or ingredients, what influences you most?",
      description: "Select up to 3",
      isRequired: true,
      maxSelectedChoices: 3,
      choices: [
        "Health / Nutrition",
        "Environmental impact",
        "Taste and Pleasure",
        "Origin / proximity",
        "Heritage / Identity",
        "Convenience or ease of preparation",
        "Brand recognition",
        "Price",
        "Quality",
        "Ethics / Animal Welfare / Labour Conditions"
      ],
      hasOther: true
    },
    {
      type: "text",
      name: "desert_island_food",
      title: `You're stuck on a desert island and can only eat one dish,
what would it be?`,
      isRequired: true
    }
  ]
},
{
  name: "regular_dishes",
  title: `Section 2:
Name three dishes you regularly eat`,
  elements: [
    {
      type: "text",
      name: "dish_1",
      title: "First, name one dish you regularly eat",
      isRequired: true
    },
    {
      type: "radiogroup",
      name: "dish_1_self_prepare",
      title: "Do you prepare it yourself?",
      description: "Select one option",
      isRequired: true,
      choices: ["Yes", "No"]
    }],
    },{
    title: `Section 2:
Name three dishes you regularly eat`,
    elements: [
    {
      type: "text",
      name: "dish_2",
      title: "Now, name another dish you regularly eat",
      isRequired: true
    },
    {
      type: "radiogroup",
      name: "dish_2_self_prepare",
      title: "Do you prepare it yourself?",
      description: "Select one option",
      isRequired: true,
      choices: ["Yes", "No"]
    },
    {
      type: "text",
      name: "dish_3",
      title: "Finally, name one more dish you regularly eat",
      isRequired: true
    },
    {
      type: "radiogroup",
      name: "dish_3_self_prepare",
      title: "Do you prepare it yourself?",
      description: "Select one option",
      isRequired: true,
      choices: ["Yes", "No"]
    },
    {
      type: "checkbox",
      name: "connected_cuisines",
      title: "Which cuisine(s) do you feel most connected to?",
      description: "Select all that apply",
      isRequired: true,
      choices: [
        "Spanish",
        "French",
        "Italian",
        "Danish",
        "Irish",
        "British",
        "Portuguese",
        "Japanese",
        "Chinese",
        "Peruvian",
        "Brazilian",
        "Mexican",
        "Arabic",
        "American",
        "Indian",
        "Korean",
        "Thai"
      ],
      hasOther: true
    },
    {
      type: "checkbox",
      name: "influences_on_cooking",
      title: "Where do you get information that influences what you cook or eat?",
      description: "Select all that apply",
      isRequired: true,
      choices: [
        "Cookbooks or magazines",
        "Parents/family",
        "Internet (e.g. Google, blogs, recipe sites)",
        "Social media (e.g. Instagram, TikTok, YouTube)",
        "Self-taught",
        "Classes",
        "Friends",
        "Immediate community (e.g. Butcher, Fishmonger)",
        "Restaurant",
        "Cultural background or heritage"
      ],
      hasOther: true
    },
    {
      type: "checkbox",
      name: "top_food_preferences",
      title: "Which are your top 3 styles or types of food you prefer?",
      description: "Select up to 3",
      isRequired: true,
      maxSelectedChoices: 3,
      choices: [
        "Traditional family recipes",
        "Home-cooked meals and comfort food",
        "Street food",
        "Snacks",
        "International cuisine and fusion cuisine",
        "Fine dining or gourmet food",
        "Brunch-style meals",
        "Fast food",
        "Sweet foods and desserts",
        "Healthy or fitness-focused meals"
      ],
      hasOther: true
    }
  ]
},
{
  name: "food_culture",
  title: `Section 3:
Let’s explore the flavours and traditions
that define your food world`,
  elements: [
    {
      type: "radiogroup",
      name: "describe_food_culture",
      title: "How would you describe your culinary or food culture?",
      description: "Select one option",
      isRequired: true,
      choices: [
        "Personal or family heritage-based",
        "A mix of influences / fusion",
        "Regional (e.g. Catalan, Sicilian, Bavarian)",
        "National (e.g. Spanish, Italian, Japanese)",
        "Broader geographical area (e.g. Mediterranean, Atlantic, Nordic)"
      ]
    }
  ]
},
// conditional page for the regional answer
{
  name: "food_culture_region",
  title: `Section 3:
Let’s explore the flavours and traditions
that define your food world`,
  visibleIf: "{describe_food_culture} = 'Regional (e.g. Catalan, Sicilian, Bavarian)'",
  elements: [
    {
      type: "text",
      name: "specify_region",
      title: "You selected Regional, please specify the region",
      isRequired: true
    }
  ]
},

{
  name: "food_culture_national",
  title: `Section 3:
Let’s explore the flavours and traditions
that define your food world`,
  visibleIf: "{describe_food_culture} = 'National (e.g. Spanish, Italian, Japanese)'",
  elements: [
    {
      type: "dropdown",
      name: "select_country",
      title: "You selected National, please select the country",
      description: "Select one option",
      isRequired: true,
      choicesByUrl: {
        url: "/countries.json",
        valueName: "name.common"
      }
    }
  ]
},

{
  name: "food_culture_broader",
  title: `Section 3:
Let’s explore the flavours and traditions
that define your food world`,
  visibleIf: "{describe_food_culture} = 'Broader geographical area (e.g. Mediterranean, Atlantic, Nordic)'",
  elements: [
    {
      type: "text",
      name: "specify_area",
      title: "You selected Broader geographical area, please name the area",
      isRequired: true
    }
  ]
},
{
  name: "iconic_ingredients",
  title: `Section 3:
Iconic ingredients from your culinary or food culture`,
  elements: [
    {
      type: "text",
      name: "ingredient_1",
      title: "First, name one iconic ingredient from your culinary or food culture",
      isRequired: true
    },
    {
      type: "text",
      name: "ingredient_2",
      title: "Now, name another iconic ingredient from your culinary or food culture",
      isRequired: true
    },
    {
      type: "text",
      name: "ingredient_3",
      title: "Finally, name the third iconic ingredient from your culinary or food culture",
      isRequired: true
    }
  ]
},
{
  name: "iconic_dishes",
  title: `Section 3:
Iconic dishes from your culinary or food culture`,
  elements: [
    {
      type: "text",
      name: "iconic_dish_1",
      title: "First, name one iconic dish from your culinary or food culture",
      isRequired: true
    },
    {
      type: "radiogroup",
      name: "iconic_dish_1_self",
      description: "Select one option",
      title: "Do you cook it for yourself?",
      isRequired: true,
      choices: ["Yes", "No"]
    },
    {
      type: "radiogroup",
      name: "iconic_dish_1_others",
      title: "Have you cooked or ordered it for others?",
      description: "Select one option",
      isRequired: true,
      choices: ["Yes", "No"]
    },
    {
      type: "radiogroup",
      name: "iconic_dish_1_last_month",
      title: "Have you eaten it in the last month?",
      description: "Select one option",
      isRequired: true,
      choices: ["Yes", "No"]
    },

    {
      type: "text",
      name: "iconic_dish_2",
      title: "Now name a second iconic dish from your culinary or food culture",
      isRequired: true
    },
    {
      type: "radiogroup",
      name: "iconic_dish_2_self",
      title: "Do you cook it for yourself?",
      description: "Select one option",
      isRequired: true,
      choices: ["Yes", "No"]
    },
    {
      type: "radiogroup",
      name: "iconic_dish_2_others",
      title: "Have you cooked or ordered it for others?",
      description: "Select one option",
      isRequired: true,
      choices: ["Yes", "No"]
    },
    {
      type: "radiogroup",
      name: "iconic_dish_2_last_month",
      title: "Have you eaten it in the last month?",
      description: "Select one option",
      isRequired: true,
      choices: ["Yes", "No"]
    },

    {
      type: "text",
      name: "iconic_dish_3",
      title: "Finally, name the third iconic dish from your culinary or food culture",
      isRequired: true
    },
    {
      type: "radiogroup",
      name: "iconic_dish_3_self",
      title: "Do you cook it for yourself?",
      description: "Select one option",
      isRequired: true,
      choices: ["Yes", "No"]
    },
    {
      type: "radiogroup",
      name: "iconic_dish_3_others",
      title: "Have you cooked or ordered it for others?",
      description: "Select one option",
      isRequired: true,
      choices: ["Yes", "No"]
    },
    {
      type: "radiogroup",
      name: "iconic_dish_3_last_month",
      title: "Have you eaten it in the last month?",
      description: "Select one option",
      isRequired: true,
      choices: ["Yes", "No"]
    },

    {
      type: "radiogroup",
      name: "dishes_reflect",
      title: "Do these kinds of dishes reflect what you eat?",
      description: "Select one option",
      isRequired: true,
      choices: ["Yes", "No"]
    }
  ]
},
{
  name: "why_not_dishes",
   title: `Section 3:
Iconic dishes from your culinary or food culture`,
  visibleIf: "{dishes_reflect} = 'No'",
  elements: [
    {
      type: "checkbox",
      name: "why_not_reasons",
      title: "Why not?",
      description: "Select all that apply",
      isRequired: true,
      choices: [
        "I can’t afford them",
        "I don’t know how to prepare them",
        "I don’t know where to find or eat them",
        "They take too long to prepare",
        "I prefer other types of food",
        "No one cooks them for me",
        "I can’t find the ingredients"
      ],
      hasOther: true
    }
  ]
},
{
  name: "iconic_dishes_frequency",
    title: `Section 3:
Iconic dishes from your culinary or food culture`,
  visibleIf: "{dishes_reflect} = 'Yes'",
  elements: [
    {
      type: "radiogroup",
      name: "iconic_dishes_how_often",
      title: "How often do you eat these iconic dishes?",
      description: "Select one option",
      isRequired: true,
      choices: [
        "Regularly (once a week or more)",
        "Occasionally (a few times a month)",
        "Rarely (a few times a year)",
        "Only on special occasions",
        "Never or almost never"
      ]
    },
    {
      type: "checkbox",
      name: "iconic_dishes_where",
      title: "Where do you usually eat these iconic dishes?",
      description: "Select all that apply",
      isRequired: true,
      choices: [
        "I cook them at home",
        "Someone else cooks them at home",
        "At my parents’ or grandparents’ home",
        "At a friend’s home",
        "At a restaurant",
        "At a takeaway or fast food",
        "At school, university or work canteen",
        "At a food market or street food stall"
      ],
      hasOther: true
    }
  ]
},
{
  name: "cooking_style",
  title: `Section 4: Your cooking style
Let’s get a taste of how you work in the kitchen`,
  elements: [
    {
      type: "radiogroup",
      name: "how_often_cook",
      title: "How often do you cook?",
      description: "Select one option",
      isRequired: true,
      choices: [
        "Never",
        "Once a week",
        "Twice a week",
        "Three days a week",
        "Four days a week",
        "Five days a week",
        "Six days a week",
        "Every day"
      ]
    }
  ]
},
{
  name: "cooking_experience",
  title: `Section 4: Your cooking style
Let’s get a taste of how you work in the kitchen`,
  visibleIf: "{how_often_cook} != 'Never'",
  elements: [
    {
      type: "radiogroup",
      name: "feel_in_kitchen",
      title: "How do you feel in the kitchen?",
      description: "Select one option",
      isRequired: true,
      choices: [
        "I feel overwhelmed — I don’t know where to start",
        "I prefer someone else to take the lead",
        "I’m not confident, but I manage",
        "Leave me alone, and I’ll figure it out!",
        "The kitchen is my zone—I feel confident and in control."
      ]
    },
    {
      type: "checkbox",
      name: "approach_cooking",
      title: "When you cook, what’s your approach?",
      description: "Select all that apply",
      isRequired: true,
      choices: [
        "I follow written recipes",
        "I watch recipe videos",
        "I rely on memory and experience",
        "I improvise as I go"
      ]
    },
    {
      type: "checkbox",
      name: "cooking_style_description",
      title: "How would you describe your cooking style?",
      description: "Select all that apply",
      isRequired: true,
      choices: [
        "Fusion",
        "Traditional / Classic",
        "Experimental / Creative",
        "Chaotic / No rules",
        "Survival / Quick / Simple",
        "Healthy / Balanced",
        "Comforting / Homestyle",
        "Trendy / Contemporary",
        "Sustainable / Ethical"
      ]
    }
  ]
},
{
  name: "improve_cooking_skills",
  title: `Section 4: Your cooking style
Let’s get a taste of how you work in the kitchen`,
  elements: [
    {
      type: "radiogroup",
      name: "improve_skills",
      title: "Would you like to improve your cooking skills?",
      description: "Select one option",
      isRequired: true,
      choices: [
        "Yes",
        "No"
      ]
    }
  ]
},
{
  name: "help_improve_cooking",
  title: `Section 4: Your cooking style
Let’s get a taste of how you work in the kitchen`,
  visibleIf: "{improve_skills} = 'Yes'",
  elements: [
    {
      type: "checkbox",
      name: "help_improve_options",
      title: "What would help you improve your cooking skills?",
      description: "Select all that apply",
      isRequired: true,
      choices: [
        "Tips and tricks about health, nutrition, and cooking",
        "Step-by-step video tutorials to learn techniques and recipes",
        "Weekly meal plans to build and practice different skills",
        "Cooking classes or workshops, online or in-person",
        "Mobile app with guided lessons and tips",
        "AI tool that offers real-time cooking advice"
      ],
      hasOther: true
    }
  ]
},
{
  name: "social_media_accounts",
  title: `Section 4: Your cooking style
Let’s get a taste of how you work in the kitchen`,
  elements: [
    {
      type: "radiogroup",
      name: "follow_social_media",
      title: "Do you follow food/cooking/nutrition accounts on social media?",
      description: "Select one option",
      isRequired: true,
      choices: ["Yes", "No"]
    },
    {
      type: "text",
      name: "list_social_accounts",
      title: "If yes, list up to three accounts (If it helps, go see three accounts you've recently saved one of their recipes)",
      visibleIf: "{follow_social_media} = 'Yes'",
      placeHolder: "Account 1, Account 2, Account 3"
    }
  ]
}
    ]
};

export default surveyRelishData;