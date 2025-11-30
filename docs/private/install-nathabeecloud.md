  su - beelab
    ls -ltr bee*
    mv beelab beelab.20250916
    git clone https://github.com/nathabee/beelab.git
    cd beelab
    cp ../beelab.20250916/.env.prod .
    beelab-prod
    ./scripts/total-reset.sh prod
    dcup
