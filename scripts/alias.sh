#source it in your session to have acess to the scripts:

alias cdbeelab='cd ~/coding/project/docker/beelab'
# dev
alias dcdev='docker compose -p beelab_dev --env-file .env.dev --profile dev'
# prod
alias dcprod='docker compose -p beelab_prod --env-file .env.prod --profile prod'
