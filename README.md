# trello-workflow-action

This github action will automate various trello and github actions based on github events.

## Workflows

### Working on card

#### Workflow Actions

* Move trello card to `Doing` list
* Add comment to trello card with github user who closed PR (only for pull_request [close] events)

#### Github Events

* [create](https://help.github.com/en/actions/reference/events-that-trigger-workflows#create-event-create)
* [pull_request \[closed\]](https://help.github.com/en/actions/reference/events-that-trigger-workflows#pull-request-event-pull_request)


### PR ready for review

#### Workflow Actions

* Move trello card to `Review` list
* Add comment to trello card with github user who opened PR and link to PR
* Update PR description with link to the trello card
* Assign labels to PR based on labels assigned to trello card

#### Github Events

* [pull_request \[opened,reopened\]](https://help.github.com/en/actions/reference/events-that-trigger-workflows#pull-request-event-pull_request)


### PR merged

#### Workflow Actions

* Move trello card to `Done` list
* Add comment to trello card with github user who merged PR
* Create github milestone and assign PR to milestone
* Add milestone url as attachment to trello card
* Close milestone (optional)
* Create github release with trello card name and url

#### Github Events

* [pull_request \[closed\]](https://help.github.com/en/actions/reference/events-that-trigger-workflows#pull-request-event-pull_request)


## Example

```yaml
name: 'trello_workflow'
on:
  create: ~
  pull_request:
    types:
      - opened
      - reopened
      - closed
jobs:
  trello_workflow:
    name: 'trello_workflow'
    runs-on: ubuntu-latest
    steps:
      - name: 'Handle github event'
        uses: mpirik/trello-workflow-action@master
        with:
          github-token: ${{secrets.GITHUB_TOKEN}}
          trello-key: ${{secrets.TRELLO_KEY}}
          trello-token: ${{secrets.TRELLO_TOKEN}}
          trello-board-name: ${{secrets.TRELLO_BOARD_NAME}}
```
