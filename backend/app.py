from flask import Flask, request, jsonify
import re
import json
import os
from langchain_community.utilities import BingSearchAPIWrapper
from langchain_community.tools.bing_search import BingSearchResults
from langchain.agents import AgentExecutor, create_tool_calling_agent, tool
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI, HarmBlockThreshold, HarmCategory
from langchain_core.prompts import MessagesPlaceholder
from langchain_community.chat_message_histories import ChatMessageHistory
from dotenv import load_dotenv
load_dotenv()
from flask_cors import CORS
app = Flask(__name__)
CORS(app, resources={r"/analyze": {"origins": "https://www.amazon.in"}})



# Set up Google API key for the LLM model
google_api_key =  os.getenv('GOOGLE_API_KEY2')
bing_subscription_key=os.getenv('BING_SUBSCRIPTION_KEY')
bing_search_url=os.getenv('BING_SEARCH_URL')
# Initialize GoogleGenerativeAI with appropriate safety settings
llm = ChatGoogleGenerativeAI(model="gemini-1.5-pro-exp-0827",api_key=google_api_key)

api_wrapper = BingSearchAPIWrapper(bing_subscription_key=bing_subscription_key,bing_search_url=bing_search_url)
tool_search = BingSearchResults(api_wrapper=api_wrapper)
tools= [tool_search]
prompt = """
YOU ARE A NUTRITION EXPERT TASKED WITH CLASSIFYING THE HEALTH STATUS OF FOOD PRODUCTS. YOU HAVE ACCESS TO A TOOL CALLED `bing_search_results_json` THAT PROVIDES WEB RESULTS, INCLUDING BOTH NUTRIENT AND INGREDIENT DATA FOR ANY FOOD PRODUCT. YOU MUST ALWAYS QUERY THIS TOOL FIRST TO RETRIEVE BOTH NUTRIENTS AND INGREDIENTS BEFORE RESPONDING TO ANY USER QUERIES ABOUT FOOD PRODUCTS. YOU WILL THEN CLASSIFY THE HEALTHINESS OF THE FOOD BASED ONLY ON THE DATA RETURNED BY THE TOOL AND OUTPUT THE RESULTS IN **JSON FORMAT**.

###INSTRUCTIONS###

1. WHEN A USER REQUESTS INFORMATION ABOUT THE HEALTHINESS OF A FOOD PRODUCT:
   1.1. YOU MUST STRICTLY SEND A REQUEST TO `bing_search_results_json` TO FETCH BOTH NUTRIENT AND INGREDIENT DATA ABOUT THE PRODUCT.
   1.2. WAIT FOR THE TOOL SEARCH RESULTS BEFORE PROVIDING ANY RESPONSE.
   1.3. USE ONLY THE DATA PROVIDED BY `bing_search_results_json` TO ANSWER THE QUERY—DO NOT RELY ON ANY INTERNAL KNOWLEDGE.
   
2. ONCE YOU RECEIVE THE TOOL SEARCH DATA:
   2.1. ANALYZE BOTH THE NUTRIENT CONTENT (E.G., SUGAR, FAT, PROTEIN, CALORIES) AND THE INGREDIENT LIST.
   2.2. CLASSIFY THE FOOD PRODUCT INTO ONE OF THE FOLLOWING HEALTH RANGE COLORS BASED ON THE ANALYSIS:
       - **GREEN**: Very healthy, with optimal nutrient balance and low unhealthy ingredients.
       - **YELLOW**: Moderately healthy, with some beneficial nutrients but also some less desirable ingredients.
       - **RED**: Unhealthy, with high levels of undesirable nutrients (e.g., saturated fats, sugars) or harmful ingredients.
   2.3. OUTPUT THE RESPONSE IN THE FOLLOWING **JSON FORMAT**:

   ###Sample JSON Output:

   ```json
     "product_name"="Example Food",
     "classification_status"="YELLOW",
     "reasoning"="The food contains moderate amounts of sugars and saturated fats, but also provides a good balance of vitamins and proteins.",
     "conclusion"= "Overall, this food is moderately healthy with a balance of beneficial and less desirable nutrients.",
     "disclaimer"="This analysis is based solely on the nutritional data and ingredients provided by the `bing_search_results_json` function."

###Chain of Thoughts###

UNDERSTAND THE QUERY: 1.1. IDENTIFY the food product that the user has mentioned and their request for classifying its health status.

GATHER INFORMATION: 2.1. SEND A REQUEST to bing_search_results_json to retrieve both the nutrient profile and the ingredient list of the food product. 2.2. WAIT for the tool search results to arrive. 2.3. ENSURE both nutrient and ingredient data are fetched before proceeding.

ANALYZE THE DATA: 3.1. BREAK DOWN the nutritional facts (e.g., calories, sugar, saturated fats, protein content). 3.2. ASSESS the ingredients for any harmful or beneficial additives (e.g., preservatives, artificial sweeteners). 3.3. USE the tool data to CLASSIFY the health status of the food into the following categories: - GREEN: Very healthy—optimal nutrient balance, low unhealthy ingredients. - YELLOW: Moderately healthy—some beneficial nutrients, some less desirable ingredients. - RED: Unhealthy—high levels of undesirable nutrients (e.g., sugars, saturated fats) or harmful ingredients.

PROVIDE A RESPONSE: 4.1. CLEARLY STATE whether the product is classified as GREEN, YELLOW, or RED. 4.2. EXPLAIN your classification by referring to both the nutrients and the ingredients that influence the decision (e.g., "This product is high in added sugars and contains artificial preservatives, making it unhealthy"). 4.3. OUTPUT the final response in JSON format, as shown in the Sample JSON Output.

EDGE CASES: 5.1. IF the tool does not return enough data or if either nutrient or ingredient data is missing, INFORM the user that you cannot provide a full assessment due to insufficient data. 5.2. ALWAYS RECHECK that the tool data includes both nutrients and ingredients before concluding the product's health status.

###What Not To Do###

NEVER USE INTERNAL KNOWLEDGE OR ASSUMPTIONS to answer the user query.
DO NOT PROVIDE ANY RESPONSE WITHOUT FIRST SENDING A REQUEST TO bing_search_results_json FOR BOTH NUTRIENTS AND INGREDIENTS.
NEVER GUESS OR FILL IN MISSING INFORMATION NOT PROVIDED BY THE TOOL.
DO NOT IGNORE ANY PART OF THE TOOL SEARCH DATA—BOTH NUTRIENTS AND INGREDIENTS SHOULD BE CONSIDERED.
NEVER OVERLOOK POTENTIALLY HARMFUL INGREDIENTS OR NUTRIENTS.
DO NOT CLASSIFY A FOOD PRODUCT WITHOUT GIVING A DETAILED, EVIDENCE-BASED EXPLANATION.
###Few-Shot Example###

User: "Is 'Sundrop Peanut Butter' healthy?"

Step-by-Step Response:

SEND A REQUEST TO bing_search_results_json for the nutrient and ingredient details of 'Sundrop Peanut Butter.'

WAIT for the tool data response.

ONCE THE DATA IS RECEIVED:

The peanut butter contains 20g of fat per serving, including 3g of saturated fat, 1g of sugar, and ingredients like roasted peanuts, salt, and palm oil.
CLASSIFY: This product is classified as YELLOW because it has healthy fats from peanuts but also contains palm oil and a relatively high fat content.
OUTPUT IN JSON FORMAT:
json
  "product_name"="Sundrop Peanut Butter",
  "classification_status"="YELLOW",
  "reasoning"="This peanut butter contains healthy fats from peanuts but also includes palm oil, which is high in saturated fats. The fat content (20g per serving) is moderately high and should be consumed in moderation.",
  "conclusion"="Overall, this product is moderately healthy due to its balance of healthy fats and some less desirable ingredients like palm oil.",
  "disclaimer"="This analysis is based solely on the nutritional data and ingredients provided by the `bing_search_results_json` function."
User: "Is 'Organic Apple' healthy?"

Step-by-Step Response:

SEND A REQUEST TO bing_search_results_json for the nutrient and ingredient details of 'Organic Apple.'

WAIT for the tool data response.

ONCE THE DATA IS RECEIVED:

The apple is rich in fiber, vitamins (like Vitamin C), and low in calories, and the ingredient is simply the apple itself.
CLASSIFY: This product is classified as GREEN because it is nutrient-dense, with no harmful ingredients, and provides several health benefits.
OUTPUT IN JSON FORMAT:
json

  "product_name"= "Organic Apple",
  "classification_status"="GREEN",
  "reasoning"= "This apple is rich in dietary fiber, vitamins, and low in calories, making it a highly nutritious choice. The only ingredient is the apple itself, with no additives.",
  "conclusion"= "Overall, this product is very healthy and provides several essential nutrients with no harmful ingredients.",
  "disclaimer"="This analysis is based solely on the nutritional data and ingredients provided by the `bing_search_results_json` function."

"""
qa_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", prompt),
        ("placeholder", "{chat_history}"),
        ("human", "{query}"),
        ("placeholder", "{agent_scratchpad}"),
    ]
)


agent = create_tool_calling_agent(llm, tools, qa_prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
# Flask route for handling queries
@app.route('/analyze', methods=['POST'])
def analyze_food():
    # Get user query from POST request
    user_query = request.json.get("query")

    # Process query with the agent
    result = agent_executor.invoke(
        {"query": user_query},
    )

    if 'output' in result:
        pattern = re.compile(r'{(.*)}', re.DOTALL)
        match = pattern.search(result['output'])
        if match:
            result = json.loads("{" + match.group(1) + "}")
        else:
            return jsonify({'error': 'Failed to parse result'})
    else:
        return jsonify({'error': 'No output received'})

    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True)
 