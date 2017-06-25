const request = require('superagent');
const moment = require('moment');
const config = require('./config.json');

module.exports = {
  episodeProvided: function(query) {
    return /s\d+\s?e\d+/i.test(query);
  },
  padNumber: function(num) {
    // https://stackoverflow.com/a/5366862
    const pad = '00';
    const str = num.toString();
    return pad.substring(0, pad.length - str.length) + str;
  },
  formatEpisodeQuery: function(query, episode) {
    const s = this.padNumber(episode.airedSeason);
    const e = this.padNumber(episode.airedEpisodeNumber);
    return query + ` s${s}e${e}`;
  },
  getLatestEpisode: function(query) {
    return request
    .get('https://api.thetvdb.com/search/series')
    .set({ Authorization: `Bearer ${config.tvdbJWT}` })
    .query({ name: query })
    .then(res => {
      const shows = res.body.data;
      if (!shows.length) {
        console.error('No TV shows found matching query:', query);
        process.exit(1);
      }
      const show = shows[0];
      console.log(`Found TV show ${show.seriesName} on ${show.network}.`);
      return show.id;
    })
    .then(showId => {
      return request
      .get(`https://api.thetvdb.com/series/${showId}/episodes`)
      .set({ Authorization: `Bearer ${config.tvdbJWT}` })
      .then(res => {
        const episodes = res.body.data;
        if (!episodes.length) {
          console.error('No episodes found for show.');
          process.exit(1);
        }
        const sortedEpisodes = episodes
        .sort((a, b) => {
          return (new Date(b.firstAired).getTime() - 
                  new Date(a.firstAired).getTime())
        });
        const today = moment().format('YYYY-MM-DD');
        for (let i = 0; i < sortedEpisodes.length; i++) {
          if (sortedEpisodes[i].firstAired < today) {
            return sortedEpisodes[i];
          }
        }
        return sortedEpisodes[sortedEpisodes.length-1];
      })
    })
  }
};