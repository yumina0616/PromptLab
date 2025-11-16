function ok(res, data){ return res.status(200).json({ data }); }
function created(res, data, location){ if (location) res.location(location); return res.status(201).json({ data }); }
function noContent(res){ return res.status(204).end(); }
module.exports = { ok, created, noContent };
