Dossier.js
========
JavaScript client libraries for the REST web services in dossier.web.


##Instantiating DossierJS

DossierJS must be initialized before it is used by instantiating its `API`
class:

```
api = new DossierJS.API(url);
```

`url` is a string representation of the server URL the API should connect to.

An example might be:

```
api = new DossierJS.API("http://10.2.3.45:8080")
```

##Creating or updating a folder

A folder can be created or updated by invoking DossierJS's `fcPut` method, as
illustrated below:

```
api.fcPut(content_id, fc)
```

`content_id` refers to the folder's id. `fc` is the folder's associated feature
collection, its content. It is important to note that `fc` must contain a `raw`
attribute and it is the contents of this attribute that are saved. `fc` is
required to be a valid JSON object.

The method `fcPut` has a dual purpose in that it is both used to **create** a
folder and to **update** a folder's contents.

Example:

*In this example `fc` contains the following:*

```
fc = {
	raw: {
		"subtopic|text|foo": "foo data",
		"subtopic|image|bar": "bar data"
	}
}
```
*`folderId` below is assumed to contain the folder's id.*
```
api.fcPut(folderId, fc)
	.done(function () {
		// folder successfully created or updated
	} );
```

The method returns a jQuery promise that resolves if the operation completed
successfully.

## Querying a folder

To retrieve the feature collection of a folder, invoke the method `fcGet` as
given by the form:

```
api.fcGet(content_id)
```

`content_id` above refers to the folder's id.

The method returns a jQuery promise that resolves to the feature collection
associated with the folder. If the folder does not yet exist, the promise is
rejected.

Example:
```
api.fcGet(folderId)
	.done(function (fc) {
		// do something with fc
	} )
	.fail(function () {
		// folder does not exist
	} );
```

##Creating or updating a subfolder

Creating a subfolder requires one to first retrieve the folder's feature
collection, if it exists, using the `fcGet` method. Then the subfolder's content
is added to the feature collection's `raw` property and an update request is
issued via the `fcPut` method.

Example of how to create or update a subfolder:

*Assumes use of variables `folderId` and `subtopic_id`*.
```
api.fcGet(folderId)
	.done(function (fc) {
		// create or update the subtopic
		fc.raw[subtopic_id] = subtopic_data;

		api.fcPut(folderId, fc)
			.done(function () {
				// Subtopic updated/created
			} );
	} );
```

Example of how to create or update a subfolder when the folder does not exist:

*Assumes use of variables `folderId` and `subtopic_id`.*

```
var update = function (fc) {
	// create or update the subtopic
	fc.raw[subtopic_id] = subtopic_data;

	api.fcPut(folderId, fc)
		.done(function () {
			// Subtopic updated/created
		} );
};

api.fcGet(folderId)
	.done(function (fc) {
		update(fc);
	} )
	.fail(function () {
		// create an empty feature collection.
		update( { raw: { } } );
	} );
```

##Adding a text snippet to a subfolder

Before adding a text snippet to a subfolder, the folder's feature collection
must be retrieved or created, as outlined above. An id uniquely representing the
text snippet must be generated and assigned to the feature collection and, once
this is done, the feature collection can then be updated using the `fcPut`
method.

The subtopic id must have the form `subtopic|text|<id>`, for a text snippet,
where the `<id>` portion is user generated; we recommend generating `<id>` based
on the MD5 hash of the anchor node's Xpath representation and the selected
text's content.

Finally, a relationship must be created between the two entities. This
relationship can be *positive*, *unknown* or *negative*; adding a text snippet
to a subfolder should always result in a *positive* relationship. The
description of the *label* relationship is created with the `Label` class,
described below, and the API method `addLabel` is then invoked to formally
update the relationship between the two entities.

The constructor of the `Label` class requires the following parameters:

 - `cid1`: the id of the first folder in the relationship
 - `cid2`: the id of the second folder in the relationship
 - `annotator_id`: user id (for now use `unknown`)
 - `coref_value`: the type of relationship (or coreference). This can be one of
   the constants `api.COREF_VALUE_POSITIVE`, `api.COREF_VALUE_UNKNOWN` or
   `api.COREF_VALUE_NEGATIVE`.
 - `subtopic_id1`: the id of the first subtopic in the relationship
 - `subtopic_id2`: the id of the second subtopic in the relationship

A practical example might be:

*This assumes that the relevant feature collection, given by `fc` has already
 been retrieved or created.*

*Generating the subtopic id:*
```
var makeTextId = function (id)
{
    return [ 'subtopic', 'text', id ].join('|');
}
```

```
// assumes getXpath method has been implemented.
var textSnippetId = makeTextId(
  CryptoJS.MD5(getXpath(window.getSelection().anchorNode).toString());

// folderId is used both for cid1 and cid2 because the relationship takes place
// within the *same* folder.
// 
// subtopic_id refers to the subfolder that the text snippet should have
// positive coreference with.
var label = new api.Label(folderId, folderId,
                          "unknown",
                          api.COREF_VALUE_POSITIVE,
                          subtopic_id, id)
	.done(function () {
		// label successfully created
	} );
```
###Adding an image to a subfolder

Adding an image to a subfolder proceeds in exactly the same manner as
highlighted above. The only difference is that, for an image, the subtopic id
must have the form `subtopic|image|<id>` where the `<id>` portion is user
generated; we recommend generating `<id>` based on the MD5 hash of the image's
`src` attribute
