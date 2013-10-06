LibreMap.BboxCollection = Backbone.Collection.extend({
  // stores options.bbox for later use and hands over to backbone's
  // initialize()
  initialize: function (models, options) {
    this.bbox = options.bbox;
    Backbone.Collection.prototype.initialize.call(this, arguments);
    this.on('sync', this.watch);
  },
  // fetches all models in the bounding box from couchdb
  // (uses the spatial view)
  fetch: function (options) {
    options = _.extend(options ? options : {}, {
      data: {
        bbox: this.bbox.toString()
      }
    });
    Backbone.Collection.prototype.fetch.call(this, options);
  },
  // parse output of couchdb's spatial view
  parse: function (response, options) {
    this.update_seq = response.update_seq;
    return _.map(response.rows, function(row) {
      return row.value;
    });
  },
  // sets up live changes from couchdb's _changes feed
  watch: function () {
    (function poll(){
      $.ajax({
        url: this.changesUrl+'&feed=longpoll&include_docs=true&since='+(this.update_seq||0),
        type: "post",
        data: JSON.stringify({
          "ids": [],
          "bbox": this.bbox
        }),
        dataType: "json",
        contentType: "application/json",
        timeout: 65000,
        success: function(data) {
          this.update_seq = data.last_seq;
          var docs = _.map(data.results, function(row) {
            return row.doc;
          });
          this.set(docs, {remove: false});
          poll.bind(this)();
        }.bind(this),
        error: function(jqxhr, msg_status, msg_err) {
          setTimeout(poll.bind(this), 10000);
        }.bind(this)
      });
    }).bind(this)();
  },
  // change the bounding box and fetch
  set_bbox: function(bbox, options) {
    this.bbox = bbox;
    this.fetch(options);
  }
});

LibreMap.RouterBboxCollection =  LibreMap.BboxCollection.extend({
  url: 'http://libremap.net/api/routers_by_location',
  changesUrl: 'http://libremap.net/api/changes?filter=libremap-api/by_id_or_bbox',
  model: LibreMap.Router
});