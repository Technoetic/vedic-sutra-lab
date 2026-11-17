# Implementation plan

Goal: 16가지 수트라를 자유롭게 조작하는 완성된 한국어 튜토리얼.
Spec: docs/design.md. Stack: native ES modules, Node24build/test/server, AsidebrowserQA. No installation/remotehosting.

- [x] Math: test invaliddomains/carry/fractions/remainders/derivatives/check-not-proof before implementingpureevaluateSutra; freeze16catalogandtestdefaults.
- [x] Runtime: failingtestsforversionidentity/startuprace/dirty/saving/rollback/networkfailure/storagefailure, then3services.
- [x] Interface: editorialresponsivehome/lesson/about,realSVGdiagrams/accessibility/reducedmotion,16independentcontrols.
- [x] Integration: asyncdata/cancellation,hashnavigation/step/inputs/saves/cardmodal. Hashbuild,strictstaticserver,generatedimageslazy.
- [x] Verifyactualbrowser16lessoninteractions+mobile+404+history+realA/Bfulldocumentguards; independentaudit. PackageZIPandlocalgitcommit; recordownvaulttaskonly.

Reviewfocus: special#13fractiondomain;#3carry;#12leadingzero;#15same-sumfalsepositive;#16instantaneousvsfinite;failedsaveandversioncheckracesmustneverdiscarddraft.
