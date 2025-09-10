# Delegating as a SAFE

Registering to Delegate from a SAFE is not working due to a few technical challenges. 

This instructions show how to create a Pull Request to register your SAFE as a Delegate anyway.

## Create a Fork of Celo MONDO

Go to https://github.com/celo-org/celo-mondo/fork


## Clone The Repo

`git clone <URL FORK URL>`

## Crate a branch

`git branch delegatee/YOUR_ACCOUNT_ADDRESSS_OR_NAME`

`git checkout NAME_OF_YOUR_BRANCH`

## Add the required files 

1. in `public/logos/` an image of your logo (can be png or jpg) 

full path like 

```
public/logos/delegatees/0xe77839713Ba66eCd041747CC1F43357CC9e665b2.png
```

*SHOULD BE SQUARE!*


2. in `src/config/delegatees/` a JSON file named `YOUR_ADDRESS.json` FULL PATH would be like.

```
src/config/delegatees/0xe77839713Ba66eCd041747CC1F43357CC9e665b2.json
```

with contents like 

```json
{
  "name": "YOUR ORG NAME",
  "address": "0xe77839713Ba66eCd041747CC1F43357CC9e665b2",
  "logoUri": "/logos/delegatees/0xe77839713Ba66eCd041747CC1F43357CC9e665b2.png",
  "date": "2025-03-12",
  "links": {
    "website": "https://your-website.com",
    "twitter": "https://x.com/your-social",
    "github": "https://github.com/your-username",
  },
  "interests": [
    "Development"
  ],
  "description": "This is an example of a short description of why people would delegate to you"
}
```

### REQUIREMENTS

* the logURI MUST match the image path you provided (leave off the public part)
* interests must ba an array of strings
* date must be near todays and in YYYY-MM-DD format
* all links (are optional) however any you include MUST start with https:// 

## Commits the files and push

`git add .` // note this adds everything in workdirectory
`git commit -m "Adding Delegate"

`git push origin`

## Open a PR

Now you should be able to navigate to github on your fork and if you just pushed it should have a link directly there to open a PR.

### Title your PR

PR should Be Tiltled "Adding Delegatee {YOUR GROUP NAME}"

### Proving yourself

* In the PR description you MUST provide a link to a social media or webpage that is clearly owned by the group you are representing AND which itself mentions the address your are registering under. 

* If possible the person Opening the PR should be a member on github for the group you are registering. (I.E. dont try and register as Blockchain CalTech but clearly only belong to Blockchain MIT)

## Care for your PR

Please Check back regularly on the status of your PR, once we enable checks to run if you see lint errors please fix them.
