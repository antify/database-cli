db = db.getSiblingDB('admin');

db.auth("root", "root");
db.createUser({
  user: "core",
  pwd: "core",
  roles: [{ role: "readWrite", db: "core" }],
});
// TODO:: create a tenant admin user which can create t_* databases
// TODO:: create a tenant user which can read t_* databases

db = db.getSiblingDB('core');

db.createCollection('tenants');
db.settings.insertMany([
  {
    name: 'foo'
  },
  {
    name: 'bar'
  }
]);