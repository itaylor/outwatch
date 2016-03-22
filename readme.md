# Outwatch
A small cli utility to allow you to watch and evaluate the output of a command and run other commands when matches are found in the output.

I created it to use with a single-process docker container so that I could watch the stdout and stderr and take action when a Tomcat web server reports that a specific warfile has been deployed.  It might be useful for other jobs as well.

# Installation
```
npm install -g outwatch
```

You can get access to the line that matched `<matchexpr>` by using the variable `OVERWATCH_LINE` in your


# Usage example
This watches a file, looks for the word 'error' and writes lines with that error to errorReport.txt
```
outwatch "tail -f /some/file.log" "/error/gi" "touch errorReport.txt; echo \$OVERWATCH_LINE >> errorReport.txt"

```

# Options reference
To see explanation of all CLI options run:
```
outwatch --help
```
