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

Folder and subfolder support exists in the web service endpoints but has not
yet been added to DossierJS. It will be added soon.

