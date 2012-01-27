Here's the (currently rough) policy by which any packages are reviewed before they're signed in the registry:

* name, description, screenshot match functionality provided (aren't misleading)
* external source includes are safe (from well known resources, like google's jquery, etc)
* no way to externally trigger dynamic/modifiable includes
* author info is real/verifiable
* data isn't leaked via any external api calls (passing private data, without owner consent)
