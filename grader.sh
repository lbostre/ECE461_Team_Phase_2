#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
  export $(cat .env | xargs)
else
  echo -e "\033[31m.env file not found!\033[0m"
  exit 1
fi

# Check if GH_TOKEN is set
if [ -z "$GITHUB_TOKEN" ]; then
  echo -e "\033[31mGitHub token not found in .env file!\033[0m"
  exit 1
fi

GROUP_ID=28
BASE_URL="http://dl-berlin.ecn.purdue.edu:8000"

schedule_run() {
  echo -e "\033[34mScheduling a run...\033[0m"
  curl --location "$BASE_URL/schedule" \
    --header 'Content-Type: application/json' \
    --data "{
      \"group\": $GROUP_ID,
      \"gh_token\": \"$GITHUB_TOKEN\"
    }"
}

queue_status() {
  echo -e "\033[34mChecking queue status...\033[0m"
  curl --location --request GET "$BASE_URL/run/all" \
    --header 'Content-Type: application/json' \
    --data "{
      \"group\": $GROUP_ID,
      \"gh_token\": \"$GITHUB_TOKEN\"
    }"
}

download_logs() {
  local OUTPUT_JSON="$1"

  # Create logs directory if it doesn't exist
  mkdir -p logs

  autograder_log=$(echo "$OUTPUT_JSON" | jq -r '.["autgrader_run_log"] // empty')
  if [ -n "$autograder_log" ]; then
    echo -e "\033[34mDownloading autograder run log...\033[0m"
    curl --silent --location --request GET "$BASE_URL/log/download" \
      --header 'Content-Type: application/json' \
      --data "{
        \"group\": $GROUP_ID,
        \"gh_token\": \"$GITHUB_TOKEN\",
        \"log\": \"$autograder_log\"
      }" --output "logs/$(basename "$autograder_log")"
  fi

  system_run_log=$(echo "$OUTPUT_JSON" | jq -r '.["system_run_log"] // empty')
  if [ -n "$system_run_log" ]; then
    echo -e "\033[34mDownloading system run log...\033[0m"
    curl --silent --location --request GET "$BASE_URL/log/download" \
      --header 'Content-Type: application/json' \
      --data "{
        \"group\": $GROUP_ID,
        \"gh_token\": \"$GITHUB_TOKEN\",
        \"log\": \"$system_run_log\"
      }" --output "logs/$(basename "$system_run_log")"
  fi
}

fix_time_est() {
    input_datetime="$1"

    # Extract components from the input
    date_part="${input_datetime:0:10}" # First 10 characters (YYYY-MM-DD)
    time_part="${input_datetime:11:12}" # Time part (HH:MM:SS.mmmmmm)

    # Extract year, month, day, hour, minute, second, and microsecond
    year="${date_part:0:4}"
    month="${date_part:5:2}"
    day="${date_part:8:2}"

    hour="${time_part:0:2}"
    minute="${time_part:3:2}"
    second_micro="${time_part:6}" # Includes seconds and microseconds

    # Convert hour to integer and subtract 5 for EST
    hour=$((10#$hour - 5))

    # Handle hour underflow and adjust the date
    if [ "$hour" -lt 0 ]; then
        hour=$((hour + 24))
        day=$((10#$day - 1))

        # Handle day underflow and adjust the month
        if [ "$day" -lt 1 ]; then
            month=$((10#$month - 1))
            if [ "$month" -lt 1 ]; then
                month=12
                year=$((year - 1))
            fi

            # Days in each month (non-leap year, handle leap years below)
            case $month in
                1|3|5|7|8|10|12) day=31 ;;
                4|6|9|11) day=30 ;;
                2)
                    # Check for leap year
                    if (( (year % 4 == 0 && year % 100 != 0) || year % 400 == 0 )); then
                        day=29
                    else
                        day=28
                    fi
                    ;;
            esac
        fi
    fi

    # Format adjusted hour to two digits
    hour=$(printf "%02d" "$hour")

    # Convert hour to 12-hour format and determine AM/PM
    if [ "$hour" -ge 12 ]; then
        am_pm="PM"
        if [ "$hour" -gt 12 ]; then
            hour=$((hour - 12))
        fi
    else
        am_pm="AM"
        if [ "$hour" -eq 0 ]; then
            hour=12
        fi
    fi

    # Ensure hour is two digits
    hour=$(printf "%02d" "$hour")

    # Combine the formatted components
    formatted_date=$(printf "%04d-%02d-%02d" "$year" "$month" "$day")
    formatted_datetime="${formatted_date} ${hour}:${minute}:${second_micro} ${am_pm}"
    echo "$formatted_datetime"
}

print_run_details() {
  local OUTPUT_JSON="$1"

  # Print the top-level details in green
  START_TIME=$(fix_time_est "$(echo "$OUTPUT_JSON" | jq -r '.["Start Time"]')")
  END_TIME=$(fix_time_est "$(echo "$OUTPUT_JSON" | jq -r '.["End Time"]')")
  RUN_TIME=$(echo "$OUTPUT_JSON" | jq -r '.["Run Time"]')
  TOTAL_TESTS=$(echo "$OUTPUT_JSON" | jq -r '.["Total Tests"]')

  echo -e "\033[32mStart Time: $START_TIME\033[0m"
  echo -e "\033[32mEnd Time: $END_TIME\033[0m"
  echo -e "\033[32mRun Time: $RUN_TIME\033[0m"
  echo -e "\033[32mTotal Tests: $TOTAL_TESTS\033[0m"

  # Print all tests
  echo -e "\033[32mTests:\033[0m"

  TESTS_JSON=$(echo "$OUTPUT_JSON" | jq -c '.["Tests"]')

  echo "$TESTS_JSON" | jq -c 'to_entries[]' | while read -r group; do
    GROUP_NAME=$(echo "$group" | jq -r '.key')
    GROUP_TOTAL_LINE=$(echo "$group" | jq -r '.value.Total // ""')

    # Count passing tests
    PASS_COUNT=$(echo "$group" | jq '[.value | to_entries[] | select(.key != "Total" and .value == 1)] | length')

    # Attempt to extract total tests number
    TOTAL_NUMBER=""
    if [[ "$GROUP_TOTAL_LINE" =~ ([0-9]+)\ *\/\ *([0-9]+) ]]; then
      TOTAL_NUMBER="${BASH_REMATCH[2]}"
    fi

    # Determine group header color
    # If we have total_number:
    #   all passing => green
    #   all failing => red
    #   mixed => yellow
    # If no total_number:
    #   if PASS_COUNT == 0 => red (all failing)
    #   else => yellow (unknown mix)
    if [ -n "$TOTAL_NUMBER" ]; then
      if [ "$PASS_COUNT" -eq "$TOTAL_NUMBER" ]; then
        GROUP_COLOR="\033[32m" # all passing
      elif [ "$PASS_COUNT" -eq 0 ]; then
        GROUP_COLOR="\033[31m" # all failing
      else
        GROUP_COLOR="\033[33m" # mixed
      fi
      echo -e "  ${GROUP_COLOR}Group: $GROUP_NAME ($PASS_COUNT / $TOTAL_NUMBER)\033[0m"
    else
      if [ "$PASS_COUNT" -eq 0 ]; then
        GROUP_COLOR="\033[31m" # all failing
      else
        GROUP_COLOR="\033[33m" # unknown mix, default to yellow
      fi
      echo -e "  ${GROUP_COLOR}Group: $GROUP_NAME\033[0m"
    fi

    # Print each test
    echo "$group" | jq -r '.value | to_entries[] | select(.key != "Total") | "\(.key): \(.value)"' | while read -r test_line; do
      if [[ "$test_line" =~ :\ 1$ ]]; then
        # Passing test green
        echo -e "    \033[32m$test_line\033[0m"
      else
        # Failing test red
        echo -e "    \033[31m$test_line\033[0m"
      fi
    done
  done
}

last_run() {
  echo -e "\033[34mFetching last run details...\033[0m"
  OUTPUT_JSON=$(curl --silent --location --request GET "$BASE_URL/last_run" \
    --header 'Content-Type: application/json' \
    --data "{
      \"group\": $GROUP_ID,
      \"gh_token\": \"$GITHUB_TOKEN\"
    }" | jq '
      . as $run | {
        "Start Time": .start_time,
        "End Time": .end_time,
        "Run Time": .run_time,
        "Total Tests": .Total,
        "Tests": (
          (. | to_entries
            | map(select(.value | type == "object"))
            | map({(.key): .value})
            | add // {})
        ),
        "autgrader_run_log": .autgrader_run_log,
        "system_run_log": .system_run_log
      }
    ')

  print_run_details "$OUTPUT_JSON"
  download_logs "$OUTPUT_JSON"
}

best_run() {
  echo -e "\033[34mFetching best run details...\033[0m"
  OUTPUT_JSON=$(curl --silent --location --request GET "$BASE_URL/best_run" \
    --header 'Content-Type: application/json' \
    --data "{
      \"group\": $GROUP_ID,
      \"gh_token\": \"$GITHUB_TOKEN\"
    }" | jq '
      . as $run | {
        "Start Time": .start_time,
        "End Time": .end_time,
        "Run Time": .run_time,
        "Total Tests": .Total,
        "Tests": (
          (. | to_entries
            | map(select(.value | type == "object"))
            | map({(.key): .value})
            | add // {})
        ),
        "autgrader_run_log": .autgrader_run_log,
        "system_run_log": .system_run_log
      }
    ')

  print_run_details "$OUTPUT_JSON"
  download_logs "$OUTPUT_JSON"
}

case "$1" in
  schedule)
    schedule_run
    ;;
  queue_status)
    queue_status
    ;;
  last_run)
    last_run
    ;;
  best_run)
    best_run
    ;;
  *)
    echo -e "\033[31mUsage: $0 {schedule|queue_status|last_run|best_run}\033[0m"
    exit 1
    ;;
esac
