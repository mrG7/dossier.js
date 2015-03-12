/* Constants */
var BASE_URL = (function() {
  var re = /host=([^&]+)/.exec(window.location.search),
      host = !!re ? re[1] : 'localhost';
  var re = /port=([0-9]+)/.exec(window.location.search),
      port = !!re ? re[1] : '8001';
  return 'http://' + host + ':' + port;
})();

/* Attributes */
var content_id = 'abc',
    fc = new DossierJS.FeatureCollection(content_id, {'NAME': {'foo': 1}}),
    lab = new DossierJS.Label('a', 'b', 'tester',
                              DossierJS.COREF_VALUE_POSITIVE);
var api,
    haveFc = false;


/* Support functions */
var labelExists = function (api, cid, label, done, fetcher, invert)
{
  if (typeof fetcher === 'undefined') {
    fetcher = function(v) { return v; };
  }
  fetcher(new DossierJS.LabelFetcher(api).cid(cid)).get()
    .fail(function() { failed(done); })
    .done(function(labels) {
      for (var i = 0; i < labels.length; i++) {
        if (labels[i].equals(label)) {
          if (invert) { failed(done); } else { passed(done); }
          return;
        }
      }
      if (invert) { passed(done); } else { failed(done); }
    });
};

var withFc = function(fn, done)
{
  expect(haveFc).toBe(true);

  if(haveFc)  fn();
  else        done();
};

var passed = function(done) {
  expect(true).toEqual(true); if (done) done();
};

var failed = function(done) {
  expect(true).toEqual(false); if (done) done();
};


/* Test specifications */
describe('DossierJS.API', function() {
  beforeEach(function() {
    console.log("1");
    api = new DossierJS.API(BASE_URL);
  });

  it('builds valid URLs', function() {
    console.log("HERE");
    var got = api.url('search_engines'),
        expected = [BASE_URL, 'dossier', 'v1', 'search_engines'].join('/');

    expect(got).toEqual(expected);
  });

  it('returns a list of search engines', function(done) {
    console.log("HERE");
    api.searchEngines().done(function(engines) {
      expect(engines.length > 0).toBe(true);
      done();
    });
  });


  describe('feature collection', function () {
    it('stores', function(done) {
      api.fcPut(content_id, fc)
        .done(function () {
          haveFc = true;
          passed(done);
        })
        .fail(function () { failed(done); });
    });

    it('retrieves', function(done) {
      withFc(function () {
        api.fcGet('abc')
          .done(function(got) {
            expect(got).toEqual(fc);
            done();
          })
          .fail(function() { failed(done); });
      }, done);
    });

    it('retrieves random', function(done) {
      withFc(function () {
        api.fcRandomGet()
          .done(function(r) {
            if (r.length === 2) passed(done);
            else                failed(done);
          })
          .fail(function() { failed(done); });
      }, done);
    });
  });


  describe('label', function () {
    it('adds', function(done) {
      withFc(function () {
        api.addLabel(lab.cid1, lab.cid2,
                     lab.annotator_id, lab.coref_value)
          .done(function() { labelExists(api, lab.cid1, lab, done); })
          .fail(function() { failed(done); });
      }, done);
    });

    it('adds another', function(done) {
      withFc(function () {
        api.addLabel(lab)
          .done(function() { labelExists(api, lab.cid1, lab, done); })
          .fail(function() { failed(done); });
      }, done);
    });

    it('adds negative', function(done) {
      withFc(function () {
        var lab = new DossierJS.Label('a', 'b', 'tester',
                                      DossierJS.COREF_VALUE_NEGATIVE);

        expect(haveFc).toBe(true);
        haveFc && api.addLabel(lab)
          .done(function() { labelExists(api, lab.cid1, lab, done); })
          .fail(function() { failed(done); });
      }, done);
    });

    it('adds negative and is inferred', function(done) {
      withFc(function () {
        var lab = new DossierJS.Label('a', 'b', 'tester',
                                      DossierJS.COREF_VALUE_NEGATIVE);
        var fetcher = function(f) { return f.which('negative-inference'); };
        api.addLabel(lab)
          .done(function() {
            labelExists(api, lab.cid1, lab, done, fetcher);
          })
          .fail(function() { failed(done); });
      }, done);
    });

    it('adds a negative label and is not part of positives', function(done) {
      withFc(function () {
        var lab = new DossierJS.Label('x', 'y', 'tester',
                                      DossierJS.COREF_VALUE_NEGATIVE);
        var fetcher = function(f) { return f.which('connected'); };
        api.addLabel(lab)
          .done(function() {
            labelExists(api, lab.cid1, lab, done, fetcher, true);
          })
          .fail(function() { failed(done); });
      }, done);
    });

    it('adds labels with subtopics', function(done) {
      withFc(function () {
        var lab = new DossierJS.Label('s', 't', 'tester',
                                      DossierJS.COREF_VALUE_POSITIVE,
                                      'subs', 'subt');
        api.addLabel(lab)
          .done(function() { labelExists(api, lab.cid1, lab, done); })
          .fail(function() { failed(done); });
      }, done);
    });

    it('adds labels with subtopics that are part of an expansion',
       function(done) { withFc(function () {
         var lab = new DossierJS.Label('m', 'n', 'tester',
                                       DossierJS.COREF_VALUE_POSITIVE,
                                       'subm', 'subn');
         var fetcher = function(f) {
           return f.which('expanded');
         };
         api.addLabel(lab)
           .done(function() { labelExists(api, lab.cid1, lab, done); })
           .fail(function() { failed(done); });
       }, done);
                      });

    it('adds labels with subtopics that are NOT part of a label traversal',
       function(done) { withFc(function () {
         var mk = function(id1, id2, subid1, subid2) {
           return new DossierJS.Label(id1, id2, 'tester',
                                      DossierJS.COREF_VALUE_POSITIVE,
                                      subid1, subid2);
         };

         var labels = [
           mk('A', 'B', 'A1', 'B2'),
           mk('B', 'C', 'B2', 'C3'),
           mk('B', 'C', 'B4', 'C5'),
         ];

         var fetcher = function(f) {
           return f.subtopic('A1').which('connected');
         };

         api.addLabels(labels)
           .done(function() {
             labelExists(api, 'A', labels[2], done, fetcher, true);
           })
           .fail(function() { failed(done); });
       }, done);
      });

      it('paginates labels', function(done) {
        withFc(function () {
          var lab1 = new DossierJS.Label('p', 'a', 'tester',
                                         DossierJS.COREF_VALUE_POSITIVE);
          var lab2 = new DossierJS.Label('p', 'b', 'tester',
                                         DossierJS.COREF_VALUE_POSITIVE);
          var fetcher = function(f) { return f.perpage(1).next(); };
          api.addLabel(lab1)
            .fail(function() { failed(done); })
            .done(function() {
              api.addLabel(lab2)
                .fail(function() { failed(done); })
                .done(function() {
                  labelExists(api, 'p', lab1, done, fetcher, true);
                  labelExists(api, 'p', lab2, done, fetcher);
                });
            });
        }, done);
      });
  });


  describe('searching', function () {
    it('basic random', function(done) {
      api.search('random', content_id, {limit: '1'}).done(function(r) {
        expect(r.results[0].content_id).toEqual(content_id);
        expect(r.results[0].fc).toEqual(fc);
        done();
      }).fail(function() { failed(done); });
    });
  });


  describe('foldering', function () {
    it('adds folders', function(done) {
      var f = DossierJS.Folder.from_name('dog');

      api.addFolder(f).done(function() {
        api.listFolders().done(function(folders) {
          console.log(folders[i]);
          for (var i = 0; i < folders.length; i++) {
            if (folders[i].id === f.id) {
              passed(done);
              return;
            }
          }
          failed(done);
        }).fail(function() { failed(done); });
      }).fail(function() { failed(done); });
    });

    it('adds subfolders', function(done) {
      var f = DossierJS.Folder.from_name('dog'),
          sf = DossierJS.Subfolder.from_name(f, 'bruce');

      api.addFolder(f).done(function() {
        api.addSubfolderItem(sf, 'abcd', 'wxyz').done(function() {
          api.listSubfolders(f).done(function(subfolders) {
            for (var i = 0; i < subfolders.length; i++) {
              var sf2 = subfolders[i];
              if (sf.folder.id == sf2.folder.id && sf.id == sf2.id) {
                passed(done);
                return;
              }
            }
            failed(done);
          }).fail(function() { failed(done); });
        }).fail(function() { failed(done); });
      }).fail(function() { failed(done); });
    });

    it('adds subfolder items', function(done) {
      var f = DossierJS.Folder.from_name('dog'),
          sf = DossierJS.Subfolder.from_name(f, 'holly');

      api.addFolder(f).done(function() {
        api.addSubfolderItem(sf, 'abcd', 'wxyz').done(function() {
          api.listSubfolderItems(sf).done(function(items) {
            for (var i = 0; i < items.length; i++) {
              var cid = items[i][0],
                  subtopic_id = items[i][1];
              if (cid === 'abcd' && subtopic_id === 'wxyz') {
                passed(done);
                return;
              }
            }
            failed(done);
          }).fail(function() { failed(done); });
        }).fail(function() { failed(done); });
      }).fail(function() { failed(done); });
    });
  });
});


describe('DossierJS.FeatureCollection', function() {
  it('returns correct StringCounter values', function() {
    var fc = new DossierJS.FeatureCollection('a', {'NAME': {'foo': 1}});
    expect(fc.value('NAME')).toEqual('foo');
  });

  it('returns correct string values', function() {
    var fc = new DossierJS.FeatureCollection('a', {'NAME': 'foo'});
    expect(fc.value('NAME')).toEqual('foo');
  });

  it('returns null for non-existent features', function() {
    var fc = new DossierJS.FeatureCollection();
    expect(fc.feature('Jim_Bob_Rockie_the_3rd')).toBeNull();
  });

  it('returns null for non-existent values', function() {
    var fc = new DossierJS.FeatureCollection();
    expect(fc.value('Billy_Ray_Trigger')).toBeNull();
  });
});
