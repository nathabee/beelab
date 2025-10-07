# CompetenceCore/management/commands/populate_data_init.py

import io
from django.core.management import call_command
from django.db import connection



import os
import csv
from datetime import datetime

from django.conf import settings
from django.core.management.base import BaseCommand

from CompetenceCore.models import (
    Annee, Catalogue, Etape, GroupageData, Niveau, Matiere, Item,
    ScoreRule, ScoreRulePoint, PDFLayout, MyImage, Translation
)




def _exec_sql(sql_text: str):
    with connection.cursor() as cur:
        for stmt in filter(None, (s.strip() for s in sql_text.split(';'))):
            cur.execute(stmt + ';')


class Command(BaseCommand):
    help = 'Import data from CSV files into Django models (descriptions are loaded from translation.csv only)'

    # ---------- helpers ----------
    @staticmethod
    def _to_bool(v: str) -> bool:
        return str(v).strip().lower() in ("1", "true", "yes", "y", "t")

    @staticmethod
    def _to_int(v: str):
        return int(v) if v is not None and str(v).strip() != "" else None

    @staticmethod
    def _to_float(v: str):
        return float(v) if v is not None and str(v).strip() != "" else None

    @staticmethod
    def _to_date(v: str):
        if not v or str(v).strip() == "":
            return None
        # returns a date object (models use DateField)
        return datetime.strptime(v, "%Y-%m-%d").date()

    # ---------- main ----------
    def handle(self, *args, **kwargs):
        base = 'CompetenceCore/script_db'

        # ---- Annee (NO description here) ----
        with open(os.path.join(base, 'annee.csv'), mode='r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                Annee.objects.update_or_create(
                    id=self._to_int(row['id']),
                    defaults={
                        'is_active': self._to_bool(row.get('is_active', 'false')),
                        'start_date': self._to_date(row.get('start_date')),
                        'stop_date': self._to_date(row.get('stop_date')),
                    }
                )
        self.stdout.write(self.style.SUCCESS('Successfully imported Annee data'))

        # ---- Niveau (NO description here) ----
        with open(os.path.join(base, 'niveau.csv'), mode='r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                Niveau.objects.update_or_create(
                    id=self._to_int(row['id']),
                    defaults={'niveau': row['niveau']}
                )
        self.stdout.write(self.style.SUCCESS('Successfully imported Niveau data'))

        # ---- Etape (NO description here) ----
        with open(os.path.join(base, 'etape.csv'), mode='r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                Etape.objects.update_or_create(
                    id=self._to_int(row['id']),
                    defaults={'etape': row['etape']}
                )
        self.stdout.write(self.style.SUCCESS('Successfully imported Etape data'))

        # ---- Matiere (NO description here) ----
        with open(os.path.join(base, 'matiere.csv'), mode='r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                Matiere.objects.update_or_create(
                    id=self._to_int(row['id']),
                    defaults={'matiere': row['matiere']}
                )
        self.stdout.write(self.style.SUCCESS('Successfully imported Matiere data'))

        # ---- Catalogue (NO description here) ----
        with open(os.path.join(base, 'catalogue.csv'), mode='r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                niveau = Niveau.objects.get(id=self._to_int(row['niveau']))
                etape = Etape.objects.get(id=self._to_int(row['etape']))
                annee = Annee.objects.get(id=self._to_int(row['annee']))
                matiere = Matiere.objects.get(id=self._to_int(row['matiere']))

                Catalogue.objects.update_or_create(
                    id=self._to_int(row['id']),
                    defaults={
                        'niveau': niveau,
                        'etape': etape,
                        'annee': annee,
                        'matiere': matiere,
                        'is_demo': self._to_bool(row.get('is_demo', 'false')),
                    }
                )
        self.stdout.write(self.style.SUCCESS('Successfully imported Catalogue data'))

        # ---- MyImage ----
        with open(os.path.join(base, 'myimage.csv'), mode='r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                try:
                    icon_path = os.path.join('', row['icon'])
                    MyImage.objects.update_or_create(
                        id=self._to_int(row['id']),
                        defaults={'icon': icon_path}
                    )
                except Exception as e:
                    self.stderr.write(self.style.ERROR(f"Error processing MyImage row {row.get('id')}: {e}"))
        self.stdout.write(self.style.SUCCESS('Successfully imported MyImage data'))

 

        # ---- GroupageData (NO desc/label here) ----
        with open(os.path.join(base, 'groupagedata.csv'), mode='r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                cat_id = self._to_int(row['catalogue'])
                try:
                    catalogue = Catalogue.objects.get(id=cat_id)
                except Catalogue.DoesNotExist:
                    self.stderr.write(self.style.WARNING(
                        f"Skipping GroupageData id={row['id']}: catalogue {cat_id} not found"
                    ))
                    continue

                groupage_icon = None
                if row.get('groupage_icon'):
                    try:
                        groupage_icon = MyImage.objects.get(id=self._to_int(row['groupage_icon']))
                    except MyImage.DoesNotExist:
                        self.stderr.write(self.style.WARNING(
                            f"GroupageData id={row['id']}: groupage_icon {row['groupage_icon']} not found; leaving empty"
                        ))

                GroupageData.objects.update_or_create(
                    id=self._to_int(row['id']),
                    defaults={
                        'catalogue': catalogue,
                        'groupage_icon': groupage_icon,
                        'position': self._to_int(row['position']),
                        'link': row['link'],
                        'max_point': self._to_int(row['max_point']),
                        'seuil1': self._to_int(row['seuil1']),
                        'seuil2': self._to_int(row['seuil2']),
                        'max_item': self._to_int(row['max_item']),
                    }
                )
        self.stdout.write(self.style.SUCCESS('Successfully imported groupagedata data'))

        # ---- ScoreRule (NO description here) ----
        with open(os.path.join(base, 'scorerule.csv'), mode='r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                ScoreRule.objects.update_or_create(
                    id=self._to_int(row['id']),
                    defaults={}
                )
        self.stdout.write(self.style.SUCCESS('Successfully imported scorerule data'))

        # ---- ScoreRulePoint (NO description here) ----
        with open(os.path.join(base, 'scorerulepoint.csv'), mode='r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                try:
                    scorerule = ScoreRule.objects.get(id=self._to_int(row['scorerule']))
                except ScoreRule.DoesNotExist:
                    self.stdout.write(self.style.ERROR(f"ScoreRule ID {row['scorerule']} does not exist."))
                    continue

                ScoreRulePoint.objects.update_or_create(
                    id=self._to_int(row['id']),
                    defaults={
                        'scorerule': scorerule,
                        'scorelabel': row['scorelabel'],
                        'score': self._to_int(row['score']),
                    }
                )
        self.stdout.write(self.style.SUCCESS('Successfully imported scorerulepoint data'))

        # ---- Item (NO description here) ----
        with open(os.path.join(base, 'item.csv'), mode='r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                try:
                    groupagedata = GroupageData.objects.get(id=self._to_int(row['groupagedata']))
                    scorerule = ScoreRule.objects.get(id=self._to_int(row['scorerule']))
                except GroupageData.DoesNotExist:
                    self.stdout.write(self.style.ERROR(f"GroupageData ID {row['groupagedata']} does not exist."))
                    continue
                except ScoreRule.DoesNotExist:
                    self.stdout.write(self.style.ERROR(f"ScoreRule ID {row['scorerule']} does not exist."))
                    continue

                Item.objects.update_or_create(
                    id=self._to_int(row['id']),
                    defaults={
                        'groupagedata': groupagedata,
                        'temps': row['temps'],
                        'observation': (row.get('observation') or None),
                        'scorerule': scorerule,
                        'max_score': self._to_float(row.get('max_score')) or 0.0,
                        'link': row['link'],
                        'itempos': self._to_int(row['itempos']),
                    }
                )
        self.stdout.write(self.style.SUCCESS('Successfully imported Item data'))

        # ---- PDFLayout ----
        with open(os.path.join(base, 'pdflayout.csv'), mode='r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                header_icon_path = os.path.join('', row['header_icon'])
                PDFLayout.objects.update_or_create(
                    id=self._to_int(row['id']),
                    defaults={
                        'header_icon': header_icon_path,
                        'language': (row.get('language') or 'en'),
                        'schule_name': row.get('schule_name') or None,
                        'header_message': row.get('header_message') or None,
                        'footer_message1': row.get('footer_message1') or None,
                        'footer_message2': row.get('footer_message2') or None,
                    }
                )
        self.stdout.write(self.style.SUCCESS('Successfully imported PDFLayout data'))

        # ---- Translation (single source of truth for all short descriptions and labels) ----
        # ---- Translation (single source of truth) ----
        from django.db import transaction

        trans_path = os.path.join(base, 'translation.csv')
        if os.path.exists(trans_path):
            with open(trans_path, mode='r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                with transaction.atomic():
                    for row in reader:
                        text = (row.get('text') or '').strip()
                        if not text:
                            continue  # skip empties
                        # Use the natural unique key, not the CSV id
                        Translation.objects.update_or_create(
                            key=row['key'],
                            ref_id=self._to_int(row['ref_id']),
                            language=row['language'],
                            defaults={'text': text},
                        )
            self.stdout.write(self.style.SUCCESS('Successfully imported Translation data'))
        else:
            self.stdout.write(self.style.WARNING('translation.csv not found — skipped'))


        #self.stdout.write(self.style.WARNING('Resetting DB sequences ...'))
        #for app_label in ('competencecore', 'pomolobeecore'):  # add 'usercore' if you seed fixed IDs there too
        #    out = io.StringIO()
        #    call_command('sqlsequencereset', app_label, stdout=out)
        #    _exec_sql(out.getvalue())
        #self.stdout.write(self.style.SUCCESS('DB sequences reset.'))
