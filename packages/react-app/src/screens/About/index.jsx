import React from 'react';
import { Container, Grid, Typography } from '@material-ui/core';
import { makeStyles, createStyles } from '@material-ui/core/styles';
import { ExternalLink, LandingHeader } from 'components';
import {
  linkedinIcon,
  teamBoyanPhoto,
  teamDaigaroPhoto,
  // teamEdgarPhoto,
  // teamUnbornPhoto,
  teamYomePhoto,
  // teamTiagoPhoto,
  teamPragueBrewerPhoto,
  partnerDelphi,
  partnerCapital,
  partnerMaven,
  partnerSpartan,
  // teamIvanPhoto,
} from 'assets/images';

const useStyles = makeStyles(theme =>
  createStyles({
    container: {
      padding: theme.spacing(2, 0, 3),
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      maxWidth: '800px',
    },
    section: {
      padding: theme.spacing(6, 3),
      textAlign: 'left',
    },
    item: {
      textAlign: 'center',
      padding: theme.spacing(3, 1, 0, 2),
      marginBottom: theme.spacing(4),
    },
    title: {
      fontWeight: '900',
      fontSize: 36,
      paddingBottom: theme.spacing(3),
    },
    subtitle: {
      fontWeight: '900',
      fontSize: 24,
    },
    text: {
      paddingBottom: theme.spacing(5),
      fontStyle: 'normal',
      '& span': {
        fontWeight: '700',
        color: theme.palette.primary.main,
      },
    },
    twitter: {
      fontSize: 16,
      color: '#FE014A',
      paddingBottom: theme.spacing(5),
    },
    meta: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    partner: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: theme.spacing(3),
    },
    partnerImage: {
      maxWidth: '80%',
    },
  }),
);

function Person({ picture, name, linkedin, twitter, position, telegram }) {
  const classes = useStyles();

  return (
    <>
      <img src={picture} alt={name} width="126" height="126" style={{ borderRadius: '500px' }} />

      <Typography className={classes.subtitle}>{name}</Typography>

      <div className={classes.meta}>
        <Typography variant="h6">
          {position}
          {linkedin && (
            <a
              href={`https://www.linkedin.com/in/${linkedin}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {' '}
              <img src={linkedinIcon} alt={`${name} Linkedin`} />
            </a>
          )}
        </Typography>
      </div>
      {twitter && (
        <a href={`https://twitter.com/${twitter}`} target="_blank" rel="noreferrer noopener">
          <Typography className={classes.twitter}>@{twitter}</Typography>
        </a>
      )}
      {telegram && (
        <a href={`https://t.me/${telegram}`} target="_blank" rel="noreferrer noopener">
          <Typography className={classes.twitter}>@{telegram}</Typography>
        </a>
      )}
    </>
  );
}

function Infos() {
  const classes = useStyles();

  return (
    <>
      <LandingHeader isShowLogo />
      <Container className={classes.container}>
        <Grid container className={classes.section}>
          <Grid item md={12} className={classes.item}>
            <Typography className={classes.title}>Vision</Typography>
            <Typography variant="subtitle1" className={classes.text}>
              We started FujiDAO&apos;s borrowing aggregator as a hackathon project and its alpha
              version is now live on mainnet. Our goal is to develop around it a community that will
              evolve towards a fully decentralized autonomous organisation.
            </Typography>
          </Grid>

          <Grid container className={classes.item}>
            <Grid item xs={12}>
              <Typography className={classes.title}>Team</Typography>
            </Grid>

            <Grid item md={4} sm={4} xs={12}>
              <Person
                picture={teamDaigaroPhoto}
                name="Daigaro Cota"
                linkedin="daigaro-cota"
                twitter="DaigaroC"
                position="Technology"
              />
            </Grid>

            <Grid item md={4} sm={4} xs={12}>
              <Person
                picture={teamBoyanPhoto}
                name="Boyan Barakov"
                linkedin="boyan-barakov-3b91891a"
                twitter="BoyanBarakov"
                position="Product"
              />
            </Grid>

            {/* <Grid item md={4} sm={4} xs={12}>
              <Person
                picture={teamEdgarPhoto}
                name="Edgar Moreau"
                linkedin="edgar-moreau-1b074b133"
                twitter="TheEdgarMoreau"
                position="Magic"
              />
            </Grid> */}

            <Grid item md={4} sm={4} xs={12}>
              <Person
                picture={teamYomePhoto}
                name="yome"
                twitter="guill__om"
                position="Techology"
              />
            </Grid>

            <Grid item md={4} sm={4} xs={12}>
              <Person
                picture={teamPragueBrewerPhoto}
                name="PragueBrewer"
                twitter="defilaunch"
                position="Community Manager"
              />
            </Grid>

            <Grid item md={4} sm={4} xs={12}>
              <Person
                picture={teamPragueBrewerPhoto}
                name="Pedro"
                position="Techology"
                twitter="0xpedrovalido"
              />
            </Grid>

            <Grid item md={4} sm={4} xs={12}>
              <Person
                picture={teamPragueBrewerPhoto}
                name="Commander Ape"
                position="Design"
                twitter=""
              />
            </Grid>
          </Grid>

          <Grid container className={classes.item} spacing={6}>
            <Grid item md={12} xs={12}>
              <Typography className={classes.title}>Partners</Typography>
            </Grid>

            <Grid item md={6} xs={12} className={classes.partner}>
              <ExternalLink href="https://delphidigital.io/">
                <img
                  src={partnerDelphi}
                  className={classes.partnerImage}
                  alt="Partner - Delphi Digital"
                />
              </ExternalLink>
            </Grid>
            <Grid item md={6} xs={12} className={classes.partner}>
              <ExternalLink href="https://metacartel.xyz/">
                <img
                  src={partnerCapital}
                  className={classes.partnerImage}
                  alt="Partner - Origin Capital"
                />
              </ExternalLink>
            </Grid>
            <Grid item md={6} xs={12} className={classes.partner}>
              <ExternalLink href="https://maven11.com/">
                <img src={partnerMaven} className={classes.partnerImage} alt="Partner - Maven 11" />
              </ExternalLink>
            </Grid>
            <Grid item md={6} xs={12} className={classes.partner}>
              <ExternalLink href="https://www.spartangroup.io/">
                <img
                  src={partnerSpartan}
                  className={classes.partnerImage}
                  alt="Partner - Spartan"
                />
              </ExternalLink>
            </Grid>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}

export default Infos;
